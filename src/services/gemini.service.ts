import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { ClaudeRequest, ClaudeResponse, ThreadContext } from '../types/index';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private generationConfig: GenerationConfig;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: config.gemini.model 
    });
    
    this.generationConfig = {
      temperature: config.gemini.temperature,
      maxOutputTokens: config.gemini.maxTokens,
      topP: 0.95,
      topK: 40,
    };
  }

  async sendMessage(request: ClaudeRequest): Promise<ClaudeResponse> {
    try {
      logger.info('Sending message to Gemini', { 
        promptLength: request.prompt.length,
        hasContext: !!request.context 
      });

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          ...this.generationConfig,
          maxOutputTokens: request.maxTokens || this.generationConfig.maxOutputTokens,
          temperature: request.temperature || this.generationConfig.temperature,
        },
      });

      const response = await result.response;
      const text = response.text();
      
      // Calculate token usage (Gemini provides this differently)
      const usage = response.usageMetadata;
      
      logger.info('Received response from Gemini', {
        outputTokens: usage?.candidatesTokenCount,
        inputTokens: usage?.promptTokenCount,
      });

      return {
        content: text,
        usage: usage ? {
          input_tokens: usage.promptTokenCount || 0,
          output_tokens: usage.candidatesTokenCount || 0,
        } : undefined,
      };
    } catch (error) {
      logger.error('Error calling Gemini API', error);
      throw error;
    }
  }

  async sendMessageWithUsage(request: ClaudeRequest): Promise<{ response: ClaudeResponse; usage?: { input_tokens: number; output_tokens: number } }> {
    const response = await this.sendMessage(request);
    return {
      response,
      usage: response.usage,
    };
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

  async autoSummarizeThreadWithUsage(context: ThreadContext): Promise<{ summary: string; usage?: { input_tokens: number; output_tokens: number } }> {
    const messages = context.messages
      .map(msg => `[${msg.user}]: ${msg.text}`)
      .join('\n');

    const prompt = `Analyze this Slack thread and provide:
1. A concise summary of the key discussion points
2. Clear action items with owners if mentioned
3. Next steps or decisions needed

Thread:
${messages}`;

    const result = await this.sendMessageWithUsage({ prompt });
    return {
      summary: result.response.content,
      usage: result.usage,
    };
  }

  async autoSummarizeChannelWithUsage(messages: string): Promise<{ summary: string; usage?: { input_tokens: number; output_tokens: number } }> {
    const prompt = `Analyze the last 24 hours of this Slack channel and provide:
1. Summary of key discussions and topics
2. Important decisions made
3. Action items and next steps
4. Any urgent matters needing attention

Messages:
${messages}`;

    const result = await this.sendMessageWithUsage({ prompt });
    return {
      summary: result.response.content,
      usage: result.usage,
    };
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

  async answerQuestionWithUsage(question: string, context?: ThreadContext): Promise<{ answer: string; usage?: { input_tokens: number; output_tokens: number } }> {
    let prompt = question;

    if (context) {
      const messages = context.messages
        .map(msg => `[${msg.user}]: ${msg.text}`)
        .join('\n');

      prompt = `Based on the following Slack conversation thread:

${messages}

Please answer this question: ${question}`;
    }

    const result = await this.sendMessageWithUsage({ prompt });
    return {
      answer: result.response.content,
      usage: result.usage,
    };
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

  async analyzeThreadWithUsage(context: ThreadContext, analysisType: string): Promise<{ analysis: string; usage?: { input_tokens: number; output_tokens: number } }> {
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
    
    const result = await this.sendMessageWithUsage({ prompt });
    return {
      analysis: result.response.content,
      usage: result.usage,
    };
  }
}