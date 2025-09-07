export interface AnalyticsEvent {
  timestamp: string;
  eventId: string;
  user: string;
  channel: string;
  channelType?: 'im' | 'channel' | 'group' | 'mpim';
  command?: string;
  query?: string;
  responseTime: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  errorStatus?: {
    hasError: boolean;
    errorType?: string;
    errorMessage?: string;
  };
  threadTs?: string;
  isInThread: boolean;
  botMentioned: boolean;
}

export interface AnalyticsStats {
  totalInteractions: number;
  totalUsers: number;
  totalChannels: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  errorRate: number;
  commandUsage: Record<string, number>;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface ChannelStats {
  channelId: string;
  channelType: string;
  totalInteractions: number;
  uniqueUsers: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  errorRate: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
  lastActivity: string;
}

export interface DailyStats {
  date: string;
  totalInteractions: number;
  uniqueUsers: number;
  uniqueChannels: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  errorCount: number;
  hourlyDistribution: Record<string, number>;
  topCommands: Array<{ command: string; count: number }>;
}

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  channel?: string;
  user?: string;
  command?: string;
  hasError?: boolean;
}