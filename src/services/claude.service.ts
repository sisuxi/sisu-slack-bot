import Anthropic from '@anthropic-ai/sdk';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ClaudeRequest, ClaudeResponse, ThreadContext } from '../types/index';

export class ClaudeService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  async sendMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    try {
      logger.info('Sending message to Claude', { 
        promptLength: request.prompt.length,
        hasContext: !!request.context 
      });

      const response = await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: request.maxTokens || config.anthropic.maxTokens,
        temperature: request.temperature || config.anthropic.temperature,
        messages: [
          {
            role: 'user',
            content: request.prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        logger.info('Received response from Claude', {
          outputTokens: response.usage?.output_tokens,
          inputTokens: response.usage?.input_tokens,
        });

        return {
          content: content.text,
          usage: response.usage ? {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
          } : undefined,
        };
      }

      throw new Error('Unexpected response type from Claude');
    } catch (error) {
      logger.error('Error calling Claude API', error);
      throw error;
    }
  }

  async summarizeThread(context: ThreadContext): Promise<string> {
    const messages = context.messages
      .map(msg => `[${msg.user}]: ${msg.text}`)
      .join('\n');

    const prompt = `Please provide a concise summary of the following Slack conversation thread:

${messages}

Provide a clear and organized summary that captures the main points, decisions, and action items discussed.`;

    const response = await this.sendMessage({ prompt });
    return response.content;
  }

  async answerQuestion(question: string, context?: ThreadContext): Promise<string> {
    let prompt = question;

    if (context) {
      const messages = context.messages
        .map(msg => `[${msg.user}]: ${msg.text}`)
        .join('\n');

      prompt = `Based on the following Slack conversation thread:

${messages}

Please answer this question: ${question}`;
    }

    const response = await this.sendMessage({ prompt });
    return response.content;
  }

  async answerQuestionWithUsage(question: string, context?: ThreadContext): Promise<ClaudeResponse> {
    let prompt = question;

    if (context) {
      const messages = context.messages
        .map(msg => `[${msg.user}]: ${msg.text}`)
        .join('\n');

      prompt = `Based on the following Slack conversation thread:

${messages}

Please answer this question: ${question}`;
    }

    return await this.sendMessage({ prompt });
  }

  async analyzeThread(context: ThreadContext, analysisType: string): Promise<string> {
    const messages = context.messages
      .map(msg => `[${msg.user}]: ${msg.text}`)
      .join('\n');

    const prompts: Record<string, string> = {
      sentiment: `Analyze the sentiment of this conversation thread. Identify the overall tone and any shifts in sentiment throughout the discussion:\n\n${messages}`,
      
      'action-items': `Extract all action items and tasks mentioned in this conversation thread. List them clearly with assigned owners if mentioned:\n\n${messages}`,
      
      decisions: `Identify all decisions made in this conversation thread. List each decision clearly with any context or rationale provided:\n\n${messages}`,
      
      topics: `List the main topics discussed in this conversation thread in order of importance:\n\n${messages}`,
    };

    const prompt = prompts[analysisType] || `Analyze the following conversation thread:\n\n${messages}`;
    
    const response = await this.sendMessage({ prompt });
    return response.content;
  }
}