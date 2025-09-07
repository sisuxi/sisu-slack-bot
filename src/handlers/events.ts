import { App } from '@slack/bolt';
import { SlackService } from '../services/slack.service.js';
import { ClaudeService } from '../services/claude.service.js';
import { commands } from './commands.js';
import { logger } from '../utils/logger.js';

const slackService = new SlackService();
const claudeService = new ClaudeService();

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

    // Parse command if present
    const commandMatch = cleanText.match(/^(\w+)\s*(.*)?$/);
    
    if (commandMatch) {
      const [, commandName, argsString] = commandMatch;
      const args = argsString ? argsString.split(/\s+/) : [];
      
      const command = commands.get(commandName.toLowerCase());
      
      if (command) {
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
        // Treat as a question for Claude
        const context = event.thread_ts
          ? await slackService.getThreadMessages(event.channel, event.thread_ts)
          : undefined;

        const response = await claudeService.answerQuestion(cleanText, context);
        
        await say({
          text: response,
          thread_ts: event.thread_ts || event.ts,
        });
      }
    } else {
      // No text after mention, show help
      const helpCommand = commands.get('help');
      if (helpCommand) {
        const response = await helpCommand.handler([], {} as any);
        await say({
          text: response,
          thread_ts: event.thread_ts || event.ts,
        });
      }
    }

    // Remove thinking reaction and add done reaction
    await slackService.addReaction(event.channel, event.ts, 'white_check_mark');
    
  } catch (error) {
    logger.error('Error handling app mention', error);
    
    await say({
      text: `Sorry, I encountered an error while processing your request. Please try again.`,
      thread_ts: event.thread_ts || event.ts,
    });
    
    await slackService.addReaction(event.channel, event.ts, 'x');
  }
}

async function handleDirectMessage(event: any, say: any): Promise<void> {
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
      const [, commandName, argsString] = commandMatch;
      const args = argsString ? argsString.split(/\s+/) : [];
      
      const command = commands.get(commandName.toLowerCase());
      
      if (command && command.command !== 'summarize' && command.command !== 'analyze') {
        // Commands that don't need context
        const response = await command.handler(args, {} as any);
        await say(response);
      } else {
        // Treat as a question for Claude
        const response = await claudeService.answerQuestion(text);
        await say(response);
      }
    } else {
      // Empty message, show help
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
    
    await say(`Sorry, I encountered an error while processing your message. Please try again.`);
    await slackService.addReaction(event.channel, event.ts, 'x');
  }
}