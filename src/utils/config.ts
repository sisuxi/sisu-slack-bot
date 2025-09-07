import { config as dotenvConfig } from 'dotenv';
import { Config } from '../types/index';

dotenvConfig();

export const config: Config = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    appToken: process.env.SLACK_APP_TOKEN || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192'),
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
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
    { value: config.gemini.apiKey, name: 'GEMINI_API_KEY' },
  ];

  const missing = required.filter(item => !item.value).map(item => item.name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}