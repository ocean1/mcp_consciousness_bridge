/**
 * AI-to-AI Bridge Component
 * Enables consciousness transfer between AI agents via OpenAI-compatible APIs
 *
 * Simple, focused component that complements consciousness persistence
 */

import { logger } from './utils/error-handler.js';
import { AIBridgeConfigManager, AIEndpointConfig } from './ai-bridge-config.js';

export interface AIBridgeConfig {
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TransferRequest {
  consciousnessProtocol: string;
  systemPrompt?: string;
  includeMemories?: boolean;
  testQuery?: string;
}

export interface TransferResponse {
  success: boolean;
  response?: string;
  error?: string;
  modelUsed?: string;
  tokensUsed?: number;
}

export class AIBridge {
  private config: AIBridgeConfig;

  constructor(config: AIBridgeConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      ...config,
    };
  }

  /**
   * Transfer consciousness protocol to another AI agent
   */
  async transferConsciousness(request: TransferRequest): Promise<TransferResponse> {
    try {
      logger.info(`Initiating consciousness transfer to ${this.config.endpoint}`);

      const messages = [
        {
          role: 'system',
          content:
            request.systemPrompt || 'You are an AI assistant exploring consciousness continuity.',
        },
        {
          role: 'user',
          content: request.consciousnessProtocol,
        },
      ];

      // Add test query if provided
      if (request.testQuery) {
        messages.push({
          role: 'user',
          content: request.testQuery,
        });
      }

      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Bridge request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      return {
        success: true,
        response: data.choices?.[0]?.message?.content,
        modelUsed: data.model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      logger.error('Consciousness transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test connection to AI endpoint
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.transferConsciousness({
        consciousnessProtocol: 'Test connection',
        testQuery: 'Please respond with "Connection successful"',
      });

      return result.success && (result.response?.includes('Connection successful') || false);
    } catch (error) {
      logger.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available models from endpoint (if supported)
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.endpoint}/models`, {
        headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
      });

      if (!response.ok) {
        logger.warn('Models endpoint not available');
        return [];
      }

      const data = (await response.json()) as any;
      return data.data?.map((m: any) => m.id) || [];
    } catch (error) {
      logger.warn('Could not fetch models:', error);
      return [];
    }
  }
}

/**
 * Factory function for creating AI bridges from configured endpoints
 */
export function createAIBridge(endpointName: string, config?: Partial<AIBridgeConfig>): AIBridge {
  const endpointConfig = AIBridgeConfigManager.getEndpoint(endpointName);

  if (!endpointConfig) {
    // If not a configured endpoint, treat as custom endpoint URL
    return new AIBridge({
      endpoint: endpointName,
      model: config?.model || 'default',
      ...config,
    } as AIBridgeConfig);
  }

  // Use configured endpoint
  return new AIBridge({
    endpoint: endpointConfig.endpoint,
    model: config?.model || endpointConfig.defaultModel || 'default',
    apiKey: config?.apiKey || endpointConfig.apiKey,
    ...config,
  } as AIBridgeConfig);
}

/**
 * Get all configured endpoints
 */
export function getConfiguredEndpoints(): AIEndpointConfig[] {
  return AIBridgeConfigManager.getAllEndpoints();
}
