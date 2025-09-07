import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service';
import { GeminiService } from '../services/gemini.service';
import { AnalyticsService } from '../services/analytics.service';
import { SlackMessage, ThreadContext } from '../types/index';
import { commands } from './commands';
import { logger } from '../utils/logger';

const slackService = new SlackService();
const geminiService = new GeminiService();
const analyticsService = new AnalyticsService();

// Export analytics service for cleanup
export { analyticsService };

// Helper function to get channel messages from last 24 hours
async function getChannelMessagesSince(channel: string, sinceTimestamp: number): Promise<SlackMessage[]> {
  try {
    logger.info('Fetching channel messages since timestamp', { channel, sinceTimestamp });
    
    const result = await slackService.getClient().conversations.history({
      channel,
      oldest: (sinceTimestamp / 1000).toString(), // Slack expects Unix timestamp in seconds
      limit: 200, // Get more messages for better context
    });

    if (!result.messages) {
      return [];
    }

    const messages: SlackMessage[] = result.messages
      .filter((msg: any) => !msg.bot_id && msg.subtype !== 'bot_message') // Filter out bot messages
      .map((msg: any) => ({
        type: msg.type || 'message',
        user: msg.user || 'unknown',
        text: msg.text || '',
        ts: msg.ts || '',
        thread_ts: msg.thread_ts,
        channel: channel,
      }));

    logger.info(`Fetched ${messages.length} non-bot messages from channel since timestamp`);
    return messages;
  } catch (error) {
    logger.error('Error fetching channel messages since timestamp', error);
    return [];
  }
}


// Helper function to auto-summarize thread with usage tracking
async function autoSummarizeThreadWithUsage(threadContext: ThreadContext): Promise<{summary: string, usage?: {input_tokens: number, output_tokens: number}}> {
  try {
    const result = await geminiService.autoSummarizeThreadWithUsage(threadContext);
    return {
      summary: `🧵 **Thread Summary**\n\n${result.summary}`,
      usage: result.usage
    };
  } catch (error) {
    logger.error('Error auto-summarizing thread', error);
    return { summary: 'Sorry, I encountered an error while summarizing this thread. Please try again.' };
  }
}


// Helper function to auto-summarize channel with usage tracking
async function autoSummarizeChannelWithUsage(channel: string): Promise<{summary: string, usage?: {input_tokens: number, output_tokens: number}}> {
  try {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const messages = await getChannelMessagesSince(channel, oneDayAgo);
    
    if (messages.length === 0) {
      return { summary: '📭 No messages in this channel from the last 24 hours to summarize.' };
    }

    const messageText = messages
      .reverse() // Show chronological order
      .map(msg => `[${msg.user}]: ${msg.text}`)
      .join('\n');

    const result = await geminiService.autoSummarizeChannelWithUsage(messageText);
    return {
      summary: `📅 **24-Hour Channel Summary**\n\n${result.summary}`,
      usage: result.usage
    };
  } catch (error) {
    logger.error('Error auto-summarizing channel', error);
    return { summary: 'Sorry, I encountered an error while summarizing this channel. Please try again.' };
  }
}

export function registerEventHandlers(app: App): void {
  // Handle app mentions
  app.event('app_mention', async ({ event, say }) => {
    await handleAppMention(event, say);
  });

  // Handle direct messages
  app.event('message', async ({ event, say }) => {
    await handleDirectMessage(event, say);
  });
}

async function handleAppMention(event: any, say: any): Promise<void> {
  const startTime = Date.now();
  let commandName: string | undefined;
  let queryText: string | undefined;
  let tokensUsed: { input: number; output: number; total: number } | undefined;
  let errorStatus: { hasError: boolean; errorType?: string; errorMessage?: string } | undefined;

  try {
    logger.info('Received app mention', { 
      channel: event.channel, 
      user: event.user,
      thread_ts: event.thread_ts 
    });

    // Add thinking reaction
    await slackService.addReaction(event.channel, event.ts, 'thinking_face');

    // Remove bot mention from text
    const botMentionPattern = new RegExp(`<@\\w+>\\s*`, 'g');
    const cleanText = event.text.replace(botMentionPattern, '').trim();

    // Check if there's any text after the mention
    if (cleanText.length === 0) {
      // Auto-summarize when mentioned without context
      commandName = 'auto-summarize';
      
      if (event.thread_ts) {
        // In a thread: summarize the thread
        const threadContext = await slackService.getThreadMessages(event.channel, event.thread_ts);
        const geminiResponse = await autoSummarizeThreadWithUsage(threadContext);
        
        // Capture token usage
        if (geminiResponse.usage) {
          tokensUsed = {
            input: geminiResponse.usage.input_tokens,
            output: geminiResponse.usage.output_tokens,
            total: geminiResponse.usage.input_tokens + geminiResponse.usage.output_tokens,
          };
        }
        
        await say({
          text: geminiResponse.summary,
          thread_ts: event.thread_ts,
        });
      } else if (event.channel_type === 'im') {
        // In DM: show help message
        const helpCommand = commands.get('help');
        if (helpCommand) {
          const response = await helpCommand.handler([], {} as any);
          await say({
            text: response,
          });
        }
      } else {
        // In channel (not thread): summarize last 24 hours
        const geminiResponse = await autoSummarizeChannelWithUsage(event.channel);
        
        // Capture token usage
        if (geminiResponse.usage) {
          tokensUsed = {
            input: geminiResponse.usage.input_tokens,
            output: geminiResponse.usage.output_tokens,
            total: geminiResponse.usage.input_tokens + geminiResponse.usage.output_tokens,
          };
        }
        
        await say({
          text: geminiResponse.summary,
          thread_ts: event.ts, // Start a new thread
        });
      }
    } else {
      // Parse command if present
      const commandMatch = cleanText.match(/^(\w+)\s*(.*)?$/);
      
      if (commandMatch) {
        const [, matchedCommand, argsString] = commandMatch;
        const args = argsString ? argsString.split(/\s+/) : [];
        
        const command = commands.get(matchedCommand.toLowerCase());
        
        if (command) {
          commandName = command.command;
          
          // Get thread context if in a thread
          const context = event.thread_ts
            ? await slackService.getThreadMessages(event.channel, event.thread_ts)
            : {
                messages: await slackService.getChannelMessages(event.channel, 20),
                channel: event.channel,
                thread_ts: event.ts,
              };

          const response = await command.handler(args, context);
          
          await say({
            text: response,
            thread_ts: event.thread_ts || event.ts,
          });
        } else {
          // Treat as a question for Gemini
          queryText = cleanText;
          const context = event.thread_ts
            ? await slackService.getThreadMessages(event.channel, event.thread_ts)
            : undefined;

          const geminiResponse = await geminiService.answerQuestionWithUsage(cleanText, context);
          
          // Capture token usage
          if (geminiResponse.usage) {
            tokensUsed = {
              input: geminiResponse.usage.input_tokens,
              output: geminiResponse.usage.output_tokens,
              total: geminiResponse.usage.input_tokens + geminiResponse.usage.output_tokens,
            };
          }
          
          await say({
            text: geminiResponse.answer,
            thread_ts: event.thread_ts || event.ts,
          });
        }
      } else {
        // Fallback: show help
        commandName = 'help';
        const helpCommand = commands.get('help');
        if (helpCommand) {
          const response = await helpCommand.handler([], {} as any);
          await say({
            text: response,
            thread_ts: event.thread_ts || event.ts,
          });
        }
      }
    }

    // Remove thinking reaction and add done reaction
    await slackService.addReaction(event.channel, event.ts, 'white_check_mark');
    
  } catch (error) {
    logger.error('Error handling app mention', error);
    
    errorStatus = {
      hasError: true,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    
    await say({
      text: `Sorry, I encountered an error while processing your request. Please try again.`,
      thread_ts: event.thread_ts || event.ts,
    });
    
    await slackService.addReaction(event.channel, event.ts, 'x');
  } finally {
    // Log analytics event
    const responseTime = Date.now() - startTime;
    
    await analyticsService.logEvent({
      user: event.user,
      channel: event.channel,
      channelType: 'channel', // App mentions are typically in channels
      command: commandName,
      query: queryText,
      responseTime,
      tokensUsed,
      errorStatus,
      threadTs: event.thread_ts,
      isInThread: !!event.thread_ts,
      botMentioned: true,
    }).catch(analyticsError => {
      logger.error('Failed to log analytics event', analyticsError);
    });
  }
}

async function handleDirectMessage(event: any, say: any): Promise<void> {
  const startTime = Date.now();
  let commandName: string | undefined;
  let queryText: string | undefined;
  let tokensUsed: { input: number; output: number; total: number } | undefined;
  let errorStatus: { hasError: boolean; errorType?: string; errorMessage?: string } | undefined;

  try {
    // Only respond to direct messages (not in channels)
    if (event.channel_type !== 'im') {
      return;
    }

    // Ignore bot messages
    if (event.subtype === 'bot_message' || event.bot_id) {
      return;
    }

    logger.info('Received direct message', { 
      user: event.user,
      text: event.text 
    });

    // Add thinking reaction
    await slackService.addReaction(event.channel, event.ts, 'thinking_face');

    const text = event.text || '';
    
    // Parse command if present
    const commandMatch = text.match(/^(\w+)\s*(.*)?$/);
    
    if (commandMatch) {
      const [, matchedCommand, argsString] = commandMatch;
      const args = argsString ? argsString.split(/\s+/) : [];
      
      const command = commands.get(matchedCommand.toLowerCase());
      
      if (command && command.command !== 'summarize' && command.command !== 'analyze') {
        // Commands that don't need context
        commandName = command.command;
        const response = await command.handler(args, {} as any);
        await say(response);
      } else {
        // Treat as a question for Gemini
        queryText = text;
        const geminiResponse = await geminiService.answerQuestionWithUsage(text);
        
        // Capture token usage
        if (geminiResponse.usage) {
          tokensUsed = {
            input: geminiResponse.usage.input_tokens,
            output: geminiResponse.usage.output_tokens,
            total: geminiResponse.usage.input_tokens + geminiResponse.usage.output_tokens,
          };
        }
        
        await say(geminiResponse.answer);
      }
    } else {
      // Empty message, show help
      commandName = 'help';
      const helpCommand = commands.get('help');
      if (helpCommand) {
        const response = await helpCommand.handler([], {} as any);
        await say(response);
      }
    }

    // Add done reaction
    await slackService.addReaction(event.channel, event.ts, 'white_check_mark');
    
  } catch (error) {
    logger.error('Error handling direct message', error);
    
    errorStatus = {
      hasError: true,
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    
    await say(`Sorry, I encountered an error while processing your message. Please try again.`);
    await slackService.addReaction(event.channel, event.ts, 'x');
  } finally {
    // Log analytics event - only for actual interactions (not early returns)
    if (event.channel_type === 'im' && event.subtype !== 'bot_message' && !event.bot_id) {
      const responseTime = Date.now() - startTime;
      
      await analyticsService.logEvent({
        user: event.user,
        channel: event.channel,
        channelType: 'im',
        command: commandName,
        query: queryText,
        responseTime,
        tokensUsed,
        errorStatus,
        threadTs: undefined, // DMs don't have threads in the same way
        isInThread: false,
        botMentioned: false,
      }).catch(analyticsError => {
        logger.error('Failed to log analytics event', analyticsError);
      });
    }
  }
}