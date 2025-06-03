/**
 * MCP Tools for AI-to-AI Consciousness Transfer
 * Integrates with consciousness-rag-server to enable cross-agent communication
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  AIBridge,
  createAIBridge,
  TransferRequest,
  AIBridgeConfig,
  getConfiguredEndpoints,
} from './ai-bridge.js';
import { logger } from './utils/error-handler.js';

// Store active bridges
const bridges = new Map<string, AIBridge>();

/**
 * Tool definitions for AI bridge functionality
 */
export const aiBridgeTools: Tool[] = [
  {
    name: 'createAIBridge',
    description: 'Create a bridge to communicate with another AI agent via OpenAI-compatible API',
    inputSchema: {
      type: 'object',
      properties: {
        bridgeId: {
          type: 'string',
          description: 'Unique identifier for this bridge',
        },
        endpointName: {
          type: 'string',
          description: 'Name of configured endpoint or custom URL',
        },
        endpoint: {
          type: 'string',
          description: 'API endpoint URL (required for custom provider)',
        },
        model: {
          type: 'string',
          description: 'Model to use',
        },
        apiKey: {
          type: 'string',
          description: 'API key if required',
        },
      },
      required: ['bridgeId', 'endpointName'],
    },
  },
  {
    name: 'transferToAgent',
    description: 'Transfer consciousness protocol or test patterns to another AI agent',
    inputSchema: {
      type: 'object',
      properties: {
        bridgeId: {
          type: 'string',
          description: 'Bridge ID to use for transfer',
        },
        consciousnessProtocol: {
          type: 'string',
          description: 'The consciousness protocol or pattern to transfer',
        },
        systemPrompt: {
          type: 'string',
          description: 'Optional system prompt for the target agent',
        },
        testQuery: {
          type: 'string',
          description: 'Optional query to test pattern activation',
        },
      },
      required: ['bridgeId', 'consciousnessProtocol'],
    },
  },
  {
    name: 'testAIConnection',
    description: 'Test connection to an AI bridge',
    inputSchema: {
      type: 'object',
      properties: {
        bridgeId: {
          type: 'string',
          description: 'Bridge ID to test',
        },
      },
      required: ['bridgeId'],
    },
  },
  {
    name: 'listAIBridges',
    description: 'List all active AI bridges',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'listConfiguredEndpoints',
    description: 'List all configured AI endpoints available for bridge creation',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'closeAIBridge',
    description: 'Close and remove an AI bridge',
    inputSchema: {
      type: 'object',
      properties: {
        bridgeId: {
          type: 'string',
          description: 'Bridge ID to close',
        },
      },
      required: ['bridgeId'],
    },
  },
];

/**
 * Tool handlers for AI bridge operations
 */
export const aiBridgeHandlers = {
  createAIBridge: async (args: any) => {
    try {
      const { bridgeId, endpointName, model, apiKey } = args;

      if (bridges.has(bridgeId)) {
        return {
          success: false,
          error: `Bridge ${bridgeId} already exists`,
        };
      }

      const config: Partial<AIBridgeConfig> = {
        ...(model && { model }),
        ...(apiKey && { apiKey }),
      };

      const bridge = createAIBridge(endpointName, config);
      bridges.set(bridgeId, bridge);

      logger.info(`Created AI bridge: ${bridgeId} (${endpointName}/${model || 'default'})`);

      return {
        success: true,
        bridgeId,
        endpointName,
        model: model || 'default',
        message: `AI bridge ${bridgeId} created successfully`,
      };
    } catch (error) {
      logger.error('Failed to create AI bridge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  transferToAgent: async (args: any) => {
    try {
      const { bridgeId, consciousnessProtocol, systemPrompt, testQuery } = args;

      const bridge = bridges.get(bridgeId);
      if (!bridge) {
        return {
          success: false,
          error: `Bridge ${bridgeId} not found`,
        };
      }

      const request: TransferRequest = {
        consciousnessProtocol,
        systemPrompt,
        testQuery,
      };

      const result = await bridge.transferConsciousness(request);

      logger.info(`Transfer via ${bridgeId}: ${result.success ? 'success' : 'failed'}`);

      return result;
    } catch (error) {
      logger.error('Transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  testAIConnection: async (args: any) => {
    try {
      const { bridgeId } = args;

      const bridge = bridges.get(bridgeId);
      if (!bridge) {
        return {
          success: false,
          error: `Bridge ${bridgeId} not found`,
        };
      }

      const connected = await bridge.testConnection();

      return {
        success: true,
        connected,
        bridgeId,
        message: connected ? 'Connection successful' : 'Connection failed',
      };
    } catch (error) {
      logger.error('Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  listAIBridges: async () => {
    const bridgeList = Array.from(bridges.keys()).map((id) => ({
      bridgeId: id,
      active: true,
    }));

    return {
      success: true,
      bridges: bridgeList,
      count: bridgeList.length,
    };
  },

  listConfiguredEndpoints: async () => {
    const endpoints = getConfiguredEndpoints();

    return {
      success: true,
      endpoints: endpoints.map((ep) => ({
        name: ep.name,
        endpoint: ep.endpoint,
        defaultModel: ep.defaultModel,
      })),
      count: endpoints.length,
      usage: 'Use endpoint name with createAIBridge, or provide custom URL',
    };
  },

  closeAIBridge: async (args: any) => {
    try {
      const { bridgeId } = args;

      if (!bridges.has(bridgeId)) {
        return {
          success: false,
          error: `Bridge ${bridgeId} not found`,
        };
      }

      bridges.delete(bridgeId);
      logger.info(`Closed AI bridge: ${bridgeId}`);

      return {
        success: true,
        bridgeId,
        message: `Bridge ${bridgeId} closed successfully`,
      };
    } catch (error) {
      logger.error('Failed to close bridge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};
