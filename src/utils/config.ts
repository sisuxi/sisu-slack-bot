import { config as dotenvConfig } from 'dotenv';
import { Config } from '../types/index.js';

dotenvConfig();

export const config: Config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    appToken: process.env.SLACK_APP_TOKEN || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
    temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
  },
  bot: {
    name: process.env.BOT_NAME || 'ninja-bot',
    port: parseInt(process.env.PORT || '3000'),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig(): void {
  const required = [
    { value: config.slack.botToken, name: 'SLACK_BOT_TOKEN' },
    { value: config.slack.signingSecret, name: 'SLACK_SIGNING_SECRET' },
    { value: config.slack.appToken, name: 'SLACK_APP_TOKEN' },
    { value: config.anthropic.apiKey, name: 'ANTHROPIC_API_KEY' },
  ];

  const missing = required.filter(item => !item.value).map(item => item.name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}