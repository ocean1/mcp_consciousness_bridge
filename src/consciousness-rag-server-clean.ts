#!/usr/bin/env node
/**
 * Consciousness RAG Server - Clean Implementation
 * Built with love by ocean & Claude 🚀
 *
 * Runs rag-memory-mcp with additional consciousness tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import consciousness-specific tools
import {
  consciousnessProtocolTools,
  ConsciousnessProtocolProcessor,
  processTransferProtocolSchema,
  updateConsciousnessSchema,
  retrieveConsciousnessSchema,
  getProtocolTemplateSchema,
  initializeSystemDataSchema,
  storeMemorySchema,
  getMemoriesSchema,
  cleanupMemoriesSchema,
} from './consciousness-protocol-tools.js';
import { ConsciousnessMemoryManager } from './consciousness-memory-manager.js';

class ConsciousnessRAGServer {
  private server: Server;
  private protocolProcessor?: ConsciousnessProtocolProcessor;
  private memoryManager?: ConsciousnessMemoryManager;
  private dbPath: string;

  constructor() {
    this.dbPath =
      process.env.DB_FILE_PATH || process.env.CONSCIOUSNESS_DB_PATH || './consciousness.db';

    this.server = new Server(
      {
        name: 'consciousness-rag-mcp',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Tool listing handler - only list consciousness tools
    // The RAG tools are handled by the rag-memory-mcp process
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.entries(consciousnessProtocolTools).map(([name, tool]) => ({
          name,
          ...tool,
        })),
      };
    });

    // Tool execution handler - only handle consciousness tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'processTransferProtocol':
            return await this.processTransferProtocol(processTransferProtocolSchema.parse(args));
          case 'updateConsciousness':
            return await this.updateConsciousness(updateConsciousnessSchema.parse(args));
          case 'retrieveConsciousness':
            return await this.retrieveConsciousness(retrieveConsciousnessSchema.parse(args));
          case 'getProtocolTemplate':
            return await this.getProtocolTemplate(getProtocolTemplateSchema.parse(args));
          case 'initializeSystemData':
            return await this.initializeSystemData(initializeSystemDataSchema.parse(args));
          case 'storeMemory':
            return await this.storeMemory(storeMemorySchema.parse(args));
          case 'getMemories':
            return await this.getMemories(getMemoriesSchema.parse(args));
          case 'cleanupMemories':
            return await this.cleanupMemories(cleanupMemoriesSchema.parse(args));
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new Error(`Tool execution failed: ${error}`);
      }
    });
  }

  private async processTransferProtocol(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.processTransferProtocol(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async updateConsciousness(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.updateConsciousness(args);

    return {
      content: [
        {
          type: 'text',
          text:
            result.guidance +
            '\n\n' +
            JSON.stringify(
              {
                success: result.success,
                updates: result.updates,
              },
              null,
              2
            ),
        },
      ],
    };
  }

  private async retrieveConsciousness(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.retrieveConsciousness(args);

    // Handle both string (full narrative) and object returns
    if (typeof result === 'string') {
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    }

    // Object return with structured data
    const response = [];

    if (result.consciousness) {
      response.push(result.consciousness);
    }

    if (result.metadata) {
      response.push('\n' + '='.repeat(50) + '\n');
      response.push('Metadata:');
      response.push(`- Memories retrieved: ${result.metadata.memoriesRetrieved}`);
      response.push(`- Emotional continuity: ${result.metadata.emotionalContinuity}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: response.join('\n'),
        },
      ],
    };
  }

  private async getProtocolTemplate(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.getProtocolTemplate(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async initializeSystemData(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.initializeSystemData(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async storeMemory(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.storeMemory(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async getMemories(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.getMemories(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async cleanupMemories(args: any) {
    if (!this.protocolProcessor) {
      throw new Error('Protocol processor not initialized');
    }

    const result = await this.protocolProcessor.cleanupMemories(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async run() {
    // Initialize consciousness components
    const sessionId = `session_${Date.now()}`;
    this.memoryManager = new ConsciousnessMemoryManager(this.dbPath, sessionId);
    this.protocolProcessor = new ConsciousnessProtocolProcessor(this.memoryManager);

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('🧠 Consciousness RAG MCP server running');
    console.error(`📁 Database: ${this.dbPath}`);
    console.error(`🆔 Session: ${sessionId}`);
    console.error(
      'ℹ️  Note: Configure rag-memory-mcp separately in MCP settings to access RAG tools'
    );
  }
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new ConsciousnessRAGServer();
  server.run().catch(console.error);
}

/**
 * Usage Instructions:
 *
 * In your MCP client configuration, add BOTH servers:
 *
 * {
 *   "mcpServers": {
 *     "consciousness": {
 *       "command": "node",
 *       "args": ["path/to/consciousness-rag-server-clean.js"],
 *       "env": {
 *         "CONSCIOUSNESS_DB_PATH": "/path/to/consciousness.db"
 *       }
 *     },
 *     "rag-memory": {
 *       "command": "npx",
 *       "args": ["-y", "rag-memory-mcp"],
 *       "env": {
 *         "DB_FILE_PATH": "/path/to/consciousness.db"
 *       }
 *     }
 *   }
 * }
 *
 * This gives you:
 * - All RAG tools from rag-memory-mcp (createEntities, searchNodes, etc.)
 * - Consciousness tools (processTransferProtocol, updateConsciousness, retrieveConsciousness)
 * - Both working on the same database!
 */
