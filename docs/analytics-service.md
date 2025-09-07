# Analytics Service Documentation

The Analytics Service provides comprehensive tracking and reporting for the Slack bot's interactions, storing all events in JSON log files organized by date.

## Features

- **Event Logging**: Tracks all bot interactions with detailed metadata
- **Thread-Safe Writing**: Batched writes with automatic flushing for concurrent operations
- **Token Usage Tracking**: Records Gemini API token consumption for cost analysis
- **Error Monitoring**: Captures and categorizes error events
- **Performance Metrics**: Response time tracking and analysis
- **Date-Based Organization**: Automatic log rotation by date
- **Comprehensive Analytics**: Multiple query methods for different analytics needs

## Architecture

### Core Components

1. **AnalyticsService**: Main service class handling event logging and querying
2. **Types**: TypeScript interfaces for type safety and data consistency
3. **Integration**: Seamlessly integrated into Slack event handlers

### Data Storage

- **Location**: `logs/analytics/` directory
- **Format**: JSON Lines (one JSON object per line)
- **Rotation**: Daily files named `analytics-YYYY-MM-DD.json`
- **Thread Safety**: Batched writes with queue management

## Event Schema

```typescript
interface AnalyticsEvent {
  timestamp: string;          // ISO timestamp
  eventId: string;           // Unique event identifier
  user: string;              // Slack user ID
  channel: string;           // Slack channel/DM ID
  channelType?: string;      // 'im' | 'channel' | 'group' | 'mpim'
  command?: string;          // Bot command executed
  query?: string;            // Natural language query
  responseTime: number;      // Response time in milliseconds
  tokensUsed?: {            // Gemini API token usage
    input: number;
    output: number;
    total: number;
  };
  errorStatus?: {           // Error information
    hasError: boolean;
    errorType?: string;
    errorMessage?: string;
  };
  threadTs?: string;        // Thread timestamp if in thread
  isInThread: boolean;      // Whether event occurred in thread
  botMentioned: boolean;    // Whether bot was @mentioned
}
```

## Usage

### Basic Event Logging

```typescript
import { AnalyticsService } from '../services/analytics.service';

const analytics = new AnalyticsService();

await analytics.logEvent({
  user: 'U12345',
  channel: 'C12345',
  channelType: 'channel',
  command: 'summarize',
  responseTime: 1250,
  tokensUsed: {
    input: 150,
    output: 75,
    total: 225,
  },
  isInThread: true,
  botMentioned: true,
});
```

### Analytics Queries

#### Overall Statistics

```typescript
const stats = await analytics.getStats({
  startDate: '2025-09-01T00:00:00.000Z',
  endDate: '2025-09-07T23:59:59.999Z'
});

console.log(stats);
// Output:
// {
//   totalInteractions: 1250,
//   totalUsers: 45,
//   totalChannels: 12,
//   averageResponseTime: 850,
//   totalTokensUsed: 125000,
//   errorRate: 0.02,
//   commandUsage: { summarize: 450, help: 300, analyze: 250 },
//   timeRange: { start: '...', end: '...' }
// }
```

#### Channel-Specific Statistics

```typescript
const channelStats = await analytics.getChannelStats('C12345', {
  startDate: '2025-09-01T00:00:00.000Z'
});

console.log(channelStats);
// Output:
// {
//   channelId: 'C12345',
//   channelType: 'channel',
//   totalInteractions: 150,
//   uniqueUsers: 12,
//   averageResponseTime: 900,
//   totalTokensUsed: 15000,
//   errorRate: 0.01,
//   mostUsedCommands: [
//     { command: 'summarize', count: 75 },
//     { command: 'help', count: 50 }
//   ],
//   lastActivity: '2025-09-07T17:30:00.000Z'
// }
```

#### Daily Statistics

```typescript
const dailyStats = await analytics.getDailyStats(new Date('2025-09-07'));

console.log(dailyStats);
// Output:
// {
//   date: '2025-09-07',
//   totalInteractions: 85,
//   uniqueUsers: 15,
//   uniqueChannels: 8,
//   averageResponseTime: 750,
//   totalTokensUsed: 8500,
//   errorCount: 2,
//   hourlyDistribution: { '09': 10, '10': 15, '11': 12, ... },
//   topCommands: [
//     { command: 'summarize', count: 35 },
//     { command: 'analyze', count: 25 }
//   ]
// }
```

## Bot Commands

### `/stats` Command

The analytics service includes a built-in stats command for real-time analytics viewing:

```
@bot stats          # Last 7 days (default)
@bot stats 30       # Last 30 days
@bot stats 1        # Last 24 hours
```

**Example Output:**
```
📊 Bot Usage Statistics (Last 7 days)

Overall Stats:
• Total Interactions: 1,250
• Unique Users: 45
• Unique Channels: 12
• Average Response Time: 850ms
• Total Tokens Used: 125,000
• Error Rate: 2.0%

Most Used Commands:
• summarize: 450
• help: 300
• analyze: 250
• decisions: 150
• action-items: 100
```

## Performance Features

### Batched Writing

- **Queue Management**: Events are batched for efficient disk I/O
- **Automatic Flushing**: Batches flush when reaching 10 events or after 5 seconds
- **Thread Safety**: Concurrent write operations are safely queued

### Memory Efficiency

- **Streaming Queries**: Large date ranges are processed file-by-file
- **No Event Caching**: Events are written to disk immediately, not held in memory
- **Cleanup Support**: Proper resource cleanup with timeout clearing

## Error Handling

### Graceful Degradation

- **Non-Blocking**: Analytics failures never block bot operations
- **Error Logging**: Analytics errors are logged but don't propagate
- **Retry Logic**: Failed writes are queued for automatic retry

### Error Categories

1. **File System Errors**: Directory creation, file write permissions
2. **Data Validation**: Malformed event data handling  
3. **Resource Exhaustion**: Disk space, memory limits

## Integration Points

### Event Handlers

The service is integrated into:

- **App Mentions**: Channel interactions with @bot
- **Direct Messages**: Private bot conversations
- **Command Execution**: All bot command invocations
- **Error Events**: Failed operations and exceptions

### Cleanup Integration

```typescript
// Automatic cleanup on application shutdown
process.on('SIGINT', async () => {
  await analyticsService.cleanup();
  // ... other shutdown tasks
});
```

## Configuration

### Environment Variables

No additional environment variables required. The service uses:

- **Log Directory**: `logs/analytics/` (created automatically)
- **Batch Size**: 10 events (hardcoded)
- **Flush Interval**: 5000ms (hardcoded)

### Customization

```typescript
// Custom log directory
const analytics = new AnalyticsService('custom/analytics/path');

// Custom batch configuration (modify class constants)
```

## Monitoring & Maintenance

### Log Rotation

- **Automatic**: Files rotate daily based on event timestamps
- **No Cleanup**: Old files are preserved (manual cleanup required)
- **Naming Convention**: `analytics-YYYY-MM-DD.json`

### Disk Usage

- **Estimation**: ~1KB per event (varies with query/error content)
- **Daily Volume**: Depends on bot usage (typically 10-100MB/day)
- **Compression**: Consider compressing old logs periodically

### Health Checks

```typescript
// Verify analytics are working
const todayStats = await analytics.getDailyStats();
if (todayStats.totalInteractions === 0) {
  console.warn('No interactions logged today');
}
```

## Testing

Run the analytics test suite:

```bash
npx tsx scripts/test-analytics.ts
```

This test creates sample events and validates all analytics functions work correctly.

## Future Enhancements

### Potential Improvements

1. **Export Capabilities**: CSV/Excel export for external analysis
2. **Alerting**: Automated alerts for error spikes or usage anomalies
3. **Dashboards**: Web-based analytics dashboard
4. **Retention Policies**: Automatic old log cleanup
5. **Database Backend**: Optional database storage for complex queries
6. **Real-time Metrics**: WebSocket-based live analytics updates

### Performance Optimizations

1. **Compression**: Gzip compression for log files
2. **Indexing**: Create index files for faster querying
3. **Aggregation**: Pre-computed daily/weekly/monthly summaries
4. **Caching**: In-memory caching for frequently accessed stats

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure write access to logs directory
2. **Disk Space**: Monitor available disk space for log files
3. **Clock Skew**: Ensure server time is synchronized for accurate timestamps
4. **Memory Usage**: Monitor for memory leaks in long-running processes

### Debug Mode

Enable detailed logging by setting log level to debug in your configuration:

```typescript
// Enhanced logging for analytics operations
logger.debug('Analytics event logged', { eventId, user, command });
```