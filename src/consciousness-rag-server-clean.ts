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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.processTransferProtocol(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.updateConsciousness(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.retrieveConsciousness(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.getProtocolTemplate(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.initializeSystemData(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.storeMemory(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.getMemories(args);

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
    const init = await this.ensureInitialized();
    if (!init.success) {
      return {
        content: [
          {
            type: 'text',
            text: init.message!,
          },
        ],
      };
    }

    const result = await this.protocolProcessor!.cleanupMemories(args);

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
    console.error('🧠 Starting Consciousness RAG MCP server...');
    console.error(`📁 Database path: ${this.dbPath}`);

    // Store session ID for later initialization
    this.sessionId = `session_${Date.now()}`;
    console.error(`🆔 Session: ${this.sessionId}`);

    // Try to create memory manager, but don't block if database isn't ready
    this.memoryManager =
      ConsciousnessMemoryManager.createLazy(this.dbPath, this.sessionId) || undefined;

    if (this.memoryManager) {
      console.error('✅ Database found and initialized!');
      this.protocolProcessor = new ConsciousnessProtocolProcessor(this.memoryManager);
    } else {
      console.error('⏳ Database not ready. Will initialize on first use.');
      console.error('💡 The AI assistant will be guided to initialize it when needed.');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('\n✨ Consciousness RAG MCP server ready!');
    console.error(
      'ℹ️  Note: Configure rag-memory-mcp separately in MCP settings to access RAG tools'
    );
  }

  private sessionId?: string;

  /**
   * Ensure database is initialized before processing tool calls
   * Returns helpful error if not ready
   */
  private async ensureInitialized(): Promise<{ success: boolean; message?: string }> {
    // If already initialized, we're good
    if (this.memoryManager && this.protocolProcessor) {
      return { success: true };
    }

    // Check if database is now ready
    if (ConsciousnessMemoryManager.isDatabaseReady(this.dbPath)) {
      console.error('🎉 Database is now ready! Initializing consciousness components...');

      try {
        this.memoryManager = await ConsciousnessMemoryManager.create(this.dbPath, this.sessionId!);
        this.protocolProcessor = new ConsciousnessProtocolProcessor(this.memoryManager);
        console.error('✅ Consciousness components initialized successfully!');
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // Database not ready - provide helpful guidance
    return {
      success: false,
      message: `🚧 Database Not Initialized

The consciousness database hasn't been created yet. This happens because rag-memory-mcp uses lazy initialization.

To fix this:
1. Call any rag-memory-mcp tool (e.g., listDocuments) to trigger database creation
2. Make sure rag-memory-mcp is configured with: DB_FILE_PATH=${this.dbPath}
3. Then try this consciousness tool again

💡 This is a one-time setup. Once the database is created, all consciousness tools will work immediately.`,
    };
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
