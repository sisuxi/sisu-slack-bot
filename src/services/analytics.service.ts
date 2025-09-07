import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import {
  AnalyticsEvent,
  AnalyticsStats,
  ChannelStats,
  DailyStats,
  AnalyticsQuery,
} from '../types/analytics';

export class AnalyticsService {
  private readonly logsDirectory: string;
  private writeQueue: Map<string, AnalyticsEvent[]> = new Map();
  private writeTimeout: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchSize = 10;
  private readonly flushInterval = 5000; // 5 seconds

  constructor(logsDirectory = 'logs/analytics') {
    this.logsDirectory = logsDirectory;
    this.ensureLogsDirectory();
  }

  /**
   * Ensure the logs directory exists
   */
  private async ensureLogsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logsDirectory, { recursive: true });
      logger.debug('Analytics logs directory ensured', { directory: this.logsDirectory });
    } catch (error) {
      logger.error('Failed to create analytics logs directory', { error, directory: this.logsDirectory });
      throw error;
    }
  }

  /**
   * Get the file path for a given date
   */
  private getLogFilePath(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return path.join(this.logsDirectory, `analytics-${dateStr}.json`);
  }

  /**
   * Generate a unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load existing events from a log file
   */
  private async loadEventsFromFile(filePath: string): Promise<AnalyticsEvent[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const lines = fileContent.trim().split('\n').filter(line => line.trim());
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return []; // File doesn't exist yet
      }
      logger.error('Failed to load events from file', { error, filePath });
      throw error;
    }
  }

  /**
   * Append events to a log file (thread-safe batched writes)
   */
  private async appendEventsToFile(filePath: string, events: AnalyticsEvent[]): Promise<void> {
    try {
      const eventLines = events.map(event => JSON.stringify(event)).join('\n') + '\n';
      await fs.appendFile(filePath, eventLines);
      logger.debug('Events appended to analytics log', { count: events.length, filePath });
    } catch (error) {
      logger.error('Failed to append events to file', { error, filePath });
      throw error;
    }
  }

  /**
   * Flush pending events for a specific date
   */
  private async flushEvents(dateKey: string): Promise<void> {
    const events = this.writeQueue.get(dateKey);
    if (!events || events.length === 0) return;

    const filePath = this.getLogFilePath(new Date(dateKey));
    await this.appendEventsToFile(filePath, events);
    
    this.writeQueue.delete(dateKey);
    const timeout = this.writeTimeout.get(dateKey);
    if (timeout) {
      clearTimeout(timeout);
      this.writeTimeout.delete(dateKey);
    }
  }

  /**
   * Log a bot interaction event
   */
  async logEvent(eventData: Omit<AnalyticsEvent, 'eventId' | 'timestamp'>): Promise<void> {
    const event: AnalyticsEvent = {
      ...eventData,
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
    };

    const dateKey = event.timestamp.split('T')[0]; // YYYY-MM-DD
    
    // Add to write queue
    if (!this.writeQueue.has(dateKey)) {
      this.writeQueue.set(dateKey, []);
    }
    this.writeQueue.get(dateKey)!.push(event);

    // Schedule flush if we hit batch size or set timeout for flush
    const queuedEvents = this.writeQueue.get(dateKey)!;
    
    if (queuedEvents.length >= this.batchSize) {
      // Immediate flush for batch size
      await this.flushEvents(dateKey);
    } else {
      // Set timeout for flush if not already set
      if (!this.writeTimeout.has(dateKey)) {
        const timeout = setTimeout(() => {
          this.flushEvents(dateKey).catch(error => {
            logger.error('Error flushing analytics events', { error, dateKey });
          });
        }, this.flushInterval);
        this.writeTimeout.set(dateKey, timeout);
      }
    }

    logger.debug('Analytics event logged', { eventId: event.eventId, user: event.user, command: event.command });
  }

  /**
   * Get comprehensive analytics stats for a date range
   */
  async getStats(query: AnalyticsQuery = {}): Promise<AnalyticsStats> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const events = await this.getEventsInRange(startDate, endDate, query);
    
    if (events.length === 0) {
      return {
        totalInteractions: 0,
        totalUsers: 0,
        totalChannels: 0,
        averageResponseTime: 0,
        totalTokensUsed: 0,
        errorRate: 0,
        commandUsage: {},
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    }

    const uniqueUsers = new Set(events.map(e => e.user)).size;
    const uniqueChannels = new Set(events.map(e => e.channel)).size;
    const totalResponseTime = events.reduce((sum, e) => sum + e.responseTime, 0);
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed?.total || 0), 0);
    const errorCount = events.filter(e => e.errorStatus?.hasError).length;
    
    const commandUsage: Record<string, number> = {};
    events.forEach(e => {
      if (e.command) {
        commandUsage[e.command] = (commandUsage[e.command] || 0) + 1;
      } else if (e.query) {
        commandUsage['query'] = (commandUsage['query'] || 0) + 1;
      }
    });

    return {
      totalInteractions: events.length,
      totalUsers: uniqueUsers,
      totalChannels: uniqueChannels,
      averageResponseTime: totalResponseTime / events.length,
      totalTokensUsed: totalTokens,
      errorRate: errorCount / events.length,
      commandUsage,
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  /**
   * Get analytics stats for a specific channel
   */
  async getChannelStats(channelId: string, query: AnalyticsQuery = {}): Promise<ChannelStats | null> {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const events = await this.getEventsInRange(startDate, endDate, { ...query, channel: channelId });
    
    if (events.length === 0) {
      return null;
    }

    const uniqueUsers = new Set(events.map(e => e.user)).size;
    const totalResponseTime = events.reduce((sum, e) => sum + e.responseTime, 0);
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed?.total || 0), 0);
    const errorCount = events.filter(e => e.errorStatus?.hasError).length;
    
    const commandCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.command) {
        commandCounts[e.command] = (commandCounts[e.command] || 0) + 1;
      } else if (e.query) {
        commandCounts['query'] = (commandCounts['query'] || 0) + 1;
      }
    });

    const mostUsedCommands = Object.entries(commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([command, count]) => ({ command, count }));

    const lastActivity = events.reduce((latest, e) => 
      e.timestamp > latest ? e.timestamp : latest, events[0].timestamp
    );

    return {
      channelId,
      channelType: events[0].channelType || 'unknown',
      totalInteractions: events.length,
      uniqueUsers,
      averageResponseTime: totalResponseTime / events.length,
      totalTokensUsed: totalTokens,
      errorRate: errorCount / events.length,
      mostUsedCommands,
      lastActivity,
    };
  }

  /**
   * Get daily analytics stats
   */
  async getDailyStats(date: Date = new Date()): Promise<DailyStats> {
    const dateStr = date.toISOString().split('T')[0];
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const events = await this.getEventsInRange(startOfDay, endOfDay);
    
    const uniqueUsers = new Set(events.map(e => e.user)).size;
    const uniqueChannels = new Set(events.map(e => e.channel)).size;
    const totalResponseTime = events.reduce((sum, e) => sum + e.responseTime, 0);
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed?.total || 0), 0);
    const errorCount = events.filter(e => e.errorStatus?.hasError).length;
    
    // Hourly distribution
    const hourlyDistribution: Record<string, number> = {};
    for (let hour = 0; hour < 24; hour++) {
      hourlyDistribution[hour.toString().padStart(2, '0')] = 0;
    }
    
    events.forEach(e => {
      const hour = new Date(e.timestamp).getUTCHours().toString().padStart(2, '0');
      hourlyDistribution[hour]++;
    });

    // Top commands
    const commandCounts: Record<string, number> = {};
    events.forEach(e => {
      if (e.command) {
        commandCounts[e.command] = (commandCounts[e.command] || 0) + 1;
      } else if (e.query) {
        commandCounts['query'] = (commandCounts['query'] || 0) + 1;
      }
    });

    const topCommands = Object.entries(commandCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([command, count]) => ({ command, count }));

    return {
      date: dateStr,
      totalInteractions: events.length,
      uniqueUsers,
      uniqueChannels,
      averageResponseTime: events.length > 0 ? totalResponseTime / events.length : 0,
      totalTokensUsed: totalTokens,
      errorCount,
      hourlyDistribution,
      topCommands,
    };
  }

  /**
   * Get events within a date range with optional filtering
   */
  private async getEventsInRange(
    startDate: Date,
    endDate: Date,
    query: AnalyticsQuery = {}
  ): Promise<AnalyticsEvent[]> {
    const events: AnalyticsEvent[] = [];
    const currentDate = new Date(startDate);

    // Flush any pending events
    for (const [dateKey] of this.writeQueue) {
      await this.flushEvents(dateKey);
    }

    while (currentDate <= endDate) {
      const filePath = this.getLogFilePath(currentDate);
      const dailyEvents = await this.loadEventsFromFile(filePath);
      
      // Filter events based on query parameters
      const filteredEvents = dailyEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        if (eventDate < startDate || eventDate > endDate) return false;
        
        if (query.channel && event.channel !== query.channel) return false;
        if (query.user && event.user !== query.user) return false;
        if (query.command && event.command !== query.command) return false;
        if (query.hasError !== undefined && (event.errorStatus?.hasError || false) !== query.hasError) return false;
        
        return true;
      });

      events.push(...filteredEvents);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Clean up resources and flush any remaining events
   */
  async cleanup(): Promise<void> {
    // Clear all timeouts
    for (const [dateKey, timeout] of this.writeTimeout) {
      clearTimeout(timeout);
      this.writeTimeout.delete(dateKey);
    }

    // Flush all remaining events
    for (const [dateKey] of this.writeQueue) {
      await this.flushEvents(dateKey);
    }

    logger.info('Analytics service cleaned up');
  }
}