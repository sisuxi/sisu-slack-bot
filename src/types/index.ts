export interface Config {
  slack: {
    botToken: string;
    signingSecret: string;
    appToken: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  bot: {
    name: string;
    port: number;
    logLevel: string;
  };
}

export interface SlackMessage {
  type: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  channel?: string;
  team?: string;
}

export interface ThreadContext {
  messages: SlackMessage[];
  channel: string;
  thread_ts: string;
}

export interface ClaudeRequest {
  prompt: string;
  context?: ThreadContext;
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface BotCommand {
  command: string;
  description: string;
  handler: (args: string[], context: ThreadContext) => Promise<string>;
}

// Re-export analytics types
export * from './analytics';