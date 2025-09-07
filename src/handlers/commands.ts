import { BotCommand, ThreadContext } from '../types/index.js';
import { ClaudeService } from '../services/claude.service.js';
import { logger } from '../utils/logger.js';

const claudeService = new ClaudeService();

export const commands: Map<string, BotCommand> = new Map([
  [
    'summarize',
    {
      command: 'summarize',
      description: 'Summarize the current thread or channel messages',
      handler: async (_args: string[], context: ThreadContext) => {
        logger.info('Executing summarize command');
        return await claudeService.summarizeThread(context);
      },
    },
  ],
  [
    'analyze',
    {
      command: 'analyze',
      description: 'Analyze the thread (sentiment, action-items, decisions, topics)',
      handler: async (args: string[], context: ThreadContext) => {
        const analysisType = args[0] || 'general';
        logger.info(`Executing analyze command with type: ${analysisType}`);
        return await claudeService.analyzeThread(context, analysisType);
      },
    },
  ],
  [
    'action-items',
    {
      command: 'action-items',
      description: 'Extract action items from the thread',
      handler: async (_args: string[], context: ThreadContext) => {
        logger.info('Extracting action items');
        return await claudeService.analyzeThread(context, 'action-items');
      },
    },
  ],
  [
    'decisions',
    {
      command: 'decisions',
      description: 'List decisions made in the thread',
      handler: async (_args: string[], context: ThreadContext) => {
        logger.info('Extracting decisions');
        return await claudeService.analyzeThread(context, 'decisions');
      },
    },
  ],
  [
    'help',
    {
      command: 'help',
      description: 'Show available commands',
      handler: async () => {
        const helpText = Array.from(commands.values())
          .map(cmd => `• \`${cmd.command}\`: ${cmd.description}`)
          .join('\n');
        
        return `*Available Commands:*\n${helpText}\n\nYou can also ask me questions directly, and I'll use Claude to help answer them!`;
      },
    },
  ],
]);