import { WebClient } from '@slack/web-api';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { SlackMessage, ThreadContext } from '../types/index';

export class SlackService {
  private client: WebClient;

  constructor() {
    this.client = new WebClient(config.slack.botToken);
  }

  // Expose client for advanced operations in event handlers
  getClient(): WebClient {
    return this.client;
  }

  async getThreadMessages(channel: string, thread_ts: string): Promise<ThreadContext> {
    try {
      logger.info('Fetching thread messages', { channel, thread_ts });

      const result = await this.client.conversations.replies({
        channel,
        ts: thread_ts,
      });

      if (!result.messages || result.messages.length === 0) {
        throw new Error('No messages found in thread');
      }

      const messages: SlackMessage[] = result.messages.map(msg => ({
        type: msg.type || 'message',
        user: msg.user || 'unknown',
        text: msg.text || '',
        ts: msg.ts || '',
        thread_ts: msg.thread_ts,
        channel: channel,
      }));

      logger.info(`Fetched ${messages.length} messages from thread`);

      return {
        messages,
        channel,
        thread_ts,
      };
    } catch (error) {
      logger.error('Error fetching thread messages', error);
      throw error;
    }
  }

  async getChannelMessages(channel: string, limit: number = 100): Promise<SlackMessage[]> {
    try {
      logger.info('Fetching channel messages', { channel, limit });

      const result = await this.client.conversations.history({
        channel,
        limit,
      });

      if (!result.messages) {
        return [];
      }

      const messages: SlackMessage[] = result.messages.map(msg => ({
        type: msg.type || 'message',
        user: msg.user || 'unknown',
        text: msg.text || '',
        ts: msg.ts || '',
        thread_ts: msg.thread_ts,
        channel: channel,
      }));

      logger.info(`Fetched ${messages.length} messages from channel`);

      return messages;
    } catch (error) {
      logger.error('Error fetching channel messages', error);
      throw error;
    }
  }

  async getUserInfo(userId: string): Promise<string> {
    try {
      const result = await this.client.users.info({ user: userId });
      return result.user?.real_name || result.user?.name || userId;
    } catch (error) {
      logger.error('Error fetching user info', error);
      return userId;
    }
  }

  async postMessage(channel: string, text: string, thread_ts?: string): Promise<void> {
    try {
      await this.client.chat.postMessage({
        channel,
        text,
        thread_ts,
      });
      logger.info('Posted message to Slack', { channel, thread_ts });
    } catch (error) {
      logger.error('Error posting message to Slack', error);
      throw error;
    }
  }

  async addReaction(channel: string, timestamp: string, emoji: string): Promise<void> {
    try {
      await this.client.reactions.add({
        channel,
        timestamp,
        name: emoji,
      });
      logger.info('Added reaction', { channel, timestamp, emoji });
    } catch (error) {
      logger.error('Error adding reaction', error);
    }
  }
}