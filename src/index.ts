import { App } from '@slack/bolt';
import { config, validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { registerEventHandlers } from './handlers/events.js';

async function startBot(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();
    logger.info('Configuration validated successfully');

    // Initialize the Slack app
    const app = new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret,
      socketMode: true,
      appToken: config.slack.appToken,
      port: config.bot.port,
    });

    // Register event handlers
    registerEventHandlers(app);
    logger.info('Event handlers registered');

    // Start the app
    await app.start();
    logger.info(`⚡️ ${config.bot.name} is running on port ${config.bot.port}!`);
    logger.info('Bot is ready to receive messages');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down bot...');
      await app.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down bot...');
      await app.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start bot', error);
    process.exit(1);
  }
}

// Start the bot
startBot().catch(error => {
  logger.error('Unhandled error', error);
  process.exit(1);
});