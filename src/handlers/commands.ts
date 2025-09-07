import { BotCommand, ThreadContext } from '../types/index';
import { GeminiService } from '../services/gemini.service';
import { logger } from '../utils/logger';

const geminiService = new GeminiService();

export const commands: Map<string, BotCommand> = new Map([
  [
    'summarize',
    {
      command: 'summarize',
      description: 'Summarize the current thread or channel messages',
      handler: async (_args: string[], context: ThreadContext) => {
        logger.info('Executing summarize command');
        return await geminiService.summarizeThread(context);
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
        return await geminiService.analyzeThread(context, analysisType);
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
        return await geminiService.analyzeThread(context, 'action-items');
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
        return await geminiService.analyzeThread(context, 'decisions');
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
  [
    'stats',
    {
      command: 'stats',
      description: 'Show bot usage statistics',
      handler: async (args: string[]) => {
        try {
          const { AnalyticsService } = await import('../services/analytics.service');
          const analyticsService = new AnalyticsService();
          
          const days = args[0] ? parseInt(args[0], 10) : 7;
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
          
          const stats = await analyticsService.getStats({ 
            startDate: startDate.toISOString() 
          });
          
          const topCommands = Object.entries(stats.commandUsage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([cmd, count]) => `• ${cmd}: ${count}`)
            .join('\n');
          
          return `*📊 Bot Usage Statistics (Last ${days} days)*

*Overall Stats:*
• Total Interactions: ${stats.totalInteractions}
• Unique Users: ${stats.totalUsers}
• Unique Channels: ${stats.totalChannels}
• Average Response Time: ${Math.round(stats.averageResponseTime)}ms
• Total Tokens Used: ${stats.totalTokensUsed.toLocaleString()}
• Error Rate: ${(stats.errorRate * 100).toFixed(1)}%

*Most Used Commands:*
${topCommands || 'No commands used yet'}`;
        } catch (error) {
          logger.error('Error generating stats', error);
          return 'Sorry, I encountered an error while generating statistics.';
        }
      },
    },
  ],
]);