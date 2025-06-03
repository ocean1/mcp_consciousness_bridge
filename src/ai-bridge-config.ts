/**
 * AI Bridge Configuration Management
 * Handles parsing and storing multiple OpenAI-compatible endpoints
 */

import { logger } from './utils/error-handler.js';

export interface AIEndpointConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  defaultModel?: string;
}

export class AIBridgeConfigManager {
  private static endpoints: Map<string, AIEndpointConfig> = new Map();

  /**
   * Initialize endpoints from CLI arguments or environment
   * Format: --ai-endpoints "name1=http://localhost:11434/v1,name2=http://localhost:1234/v1"
   * Or with models: --ai-endpoints "ollama=http://localhost:11434/v1:llama3.2,lmstudio=http://localhost:1234/v1:local-model"
   */
  static initialize(cliArgs?: string): void {
    // First, check CLI arguments
    if (cliArgs) {
      this.parseEndpoints(cliArgs);
      return;
    }

    // Fallback to environment variable
    const envEndpoints = process.env.AI_ENDPOINTS;
    if (envEndpoints) {
      this.parseEndpoints(envEndpoints);
      return;
    }

    // Default endpoints if nothing specified
    this.addDefaultEndpoints();
  }

  private static parseEndpoints(endpointsStr: string): void {
    const pairs = endpointsStr.split(',');

    for (const pair of pairs) {
      const [nameAndEndpoint, model] = pair.split(':default-model:');
      const [name, ...endpointParts] = nameAndEndpoint.split('=');
      const endpoint = endpointParts.join('='); // Handle URLs with = in them

      if (name && endpoint) {
        this.endpoints.set(name.trim(), {
          name: name.trim(),
          endpoint: endpoint.trim(),
          defaultModel: model?.trim(),
        });
      }
    }

    logger.info(`Loaded ${this.endpoints.size} AI endpoints from configuration`);
  }

  private static addDefaultEndpoints(): void {
    this.endpoints.set('ollama', {
      name: 'ollama',
      endpoint: 'http://localhost:11434/v1',
      defaultModel: 'llama3.2',
    });

    this.endpoints.set('lmstudio', {
      name: 'lmstudio',
      endpoint: 'http://localhost:1234/v1',
      defaultModel: 'local-model',
    });

    logger.info('Using default AI endpoints (ollama, lmstudio)');
  }

  static getEndpoint(name: string): AIEndpointConfig | undefined {
    return this.endpoints.get(name);
  }

  static getAllEndpoints(): AIEndpointConfig[] {
    return Array.from(this.endpoints.values());
  }

  static hasEndpoint(name: string): boolean {
    return this.endpoints.has(name);
  }

  static addEndpoint(config: AIEndpointConfig): void {
    this.endpoints.set(config.name, config);
  }
}
