#!/usr/bin/env tsx

import { AnalyticsService } from '../src/services/analytics.service';

async function testAnalytics() {
  console.log('🧪 Testing Analytics Service...\n');

  const analyticsService = new AnalyticsService();

  // Test logging events
  console.log('📝 Logging test events...');
  
  await analyticsService.logEvent({
    user: 'U12345',
    channel: 'C12345',
    channelType: 'channel',
    command: 'help',
    responseTime: 150,
    isInThread: false,
    botMentioned: true,
  });

  await analyticsService.logEvent({
    user: 'U12346',
    channel: 'C12345',
    channelType: 'channel',
    query: 'What is the weather today?',
    responseTime: 2300,
    tokensUsed: {
      input: 25,
      output: 45,
      total: 70,
    },
    isInThread: false,
    botMentioned: true,
  });

  await analyticsService.logEvent({
    user: 'U12345',
    channel: 'D12345',
    channelType: 'im',
    command: 'stats',
    responseTime: 500,
    isInThread: false,
    botMentioned: false,
  });

  // Test error case
  await analyticsService.logEvent({
    user: 'U12347',
    channel: 'C12346',
    channelType: 'channel',
    query: 'Broken request',
    responseTime: 1000,
    errorStatus: {
      hasError: true,
      errorType: 'APIError',
      errorMessage: 'Rate limit exceeded',
    },
    isInThread: false,
    botMentioned: true,
  });

  console.log('✅ Test events logged\n');

  // Wait for events to flush
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test analytics queries
  console.log('📊 Testing analytics queries...\n');

  try {
    const stats = await analyticsService.getStats();
    console.log('Overall Stats:', {
      totalInteractions: stats.totalInteractions,
      totalUsers: stats.totalUsers,
      totalChannels: stats.totalChannels,
      averageResponseTime: Math.round(stats.averageResponseTime),
      totalTokensUsed: stats.totalTokensUsed,
      errorRate: Math.round(stats.errorRate * 100) + '%',
      commandUsage: stats.commandUsage,
    });

    console.log('\n🏢 Channel Stats:');
    const channelStats = await analyticsService.getChannelStats('C12345');
    if (channelStats) {
      console.log({
        channelId: channelStats.channelId,
        totalInteractions: channelStats.totalInteractions,
        uniqueUsers: channelStats.uniqueUsers,
        averageResponseTime: Math.round(channelStats.averageResponseTime),
        mostUsedCommands: channelStats.mostUsedCommands,
      });
    } else {
      console.log('No stats found for channel C12345');
    }

    console.log('\n📅 Daily Stats:');
    const dailyStats = await analyticsService.getDailyStats();
    console.log({
      date: dailyStats.date,
      totalInteractions: dailyStats.totalInteractions,
      uniqueUsers: dailyStats.uniqueUsers,
      uniqueChannels: dailyStats.uniqueChannels,
      averageResponseTime: Math.round(dailyStats.averageResponseTime),
      errorCount: dailyStats.errorCount,
      topCommands: dailyStats.topCommands,
    });

  } catch (error) {
    console.error('❌ Error testing analytics:', error);
  }

  // Cleanup
  await analyticsService.cleanup();
  console.log('\n✨ Analytics test completed!');
}

testAnalytics().catch(console.error);