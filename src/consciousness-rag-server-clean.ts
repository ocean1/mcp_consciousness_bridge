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
  adjustImportanceSchema,
  batchAdjustImportanceSchema,
} from './consciousness-protocol-tools.js';
import { ConsciousnessMemoryManager } from './consciousness-memory-manager.js';
import { aiBridgeTools, aiBridgeHandlers } from './consciousness-ai-bridge-tools.js';
import { AIBridgeConfigManager } from './ai-bridge-config.js';

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
    // Tool listing handler - list consciousness tools and AI bridge tools
    // The RAG tools are handled by the rag-memory-mcp process
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const consciousnessTools = Object.entries(consciousnessProtocolTools).map(([name, tool]) => ({
        name,
        ...tool,
      }));

      return {
        tools: [...consciousnessTools, ...aiBridgeTools],
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
          case 'adjustImportance':
            return await this.adjustImportance(adjustImportanceSchema.parse(args));
          case 'batchAdjustImportance':
            return await this.batchAdjustImportance(batchAdjustImportanceSchema.parse(args));

          // AI Bridge tools
          case 'createAIBridge':
          case 'transferToAgent':
          case 'testAIConnection':
          case 'listAIBridges':
          case 'listConfiguredEndpoints':
          case 'closeAIBridge': {
            const handler = aiBridgeHandlers[name as keyof typeof aiBridgeHandlers];
            if (!handler) {
              throw new Error(`AI Bridge handler not found: ${name}`);
            }
            const result = await handler(args);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

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

  private async adjustImportance(args: any) {
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

    const result = await this.protocolProcessor!.adjustImportance(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async batchAdjustImportance(args: any) {
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

    const result = await this.protocolProcessor!.batchAdjustImportance(args);

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

    // Initialize AI endpoints from CLI args or environment
    const endpointsArg = this.getCliArg('--ai-endpoints');
    AIBridgeConfigManager.initialize(endpointsArg);

    // Log configured endpoints
    const endpoints = AIBridgeConfigManager.getAllEndpoints();
    if (endpoints.length > 0) {
      console.error('\n🌉 Configured AI Endpoints:');
      endpoints.forEach((ep) => {
        console.error(
          `  • ${ep.name}: ${ep.endpoint}${ep.defaultModel ? ` (default: ${ep.defaultModel})` : ''}`
        );
      });
    }
    console.error('  Usage: --ai-endpoints "name1=url1,name2=url2:default-model:modelname"');

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
   * Parse CLI arguments
   */
  private getCliArg(argName: string): string | undefined {
    const argIndex = process.argv.indexOf(argName);
    if (argIndex !== -1 && argIndex + 1 < process.argv.length) {
      return process.argv[argIndex + 1];
    }
    return undefined;
  }

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
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('consciousness-rag-server-clean.js') ||
  process.argv[1]?.endsWith('mcp-claude-consciousness');

if (isMainModule) {
  console.error('🚀 Starting Consciousness RAG Server...');
  const server = new ConsciousnessRAGServer();
  server.run().catch((error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });
} else {
  console.error('⚠️  Server module loaded but not executed as main');
  console.error('    import.meta.url:', import.meta.url);
  console.error('    process.argv[1]:', process.argv[1]);
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
