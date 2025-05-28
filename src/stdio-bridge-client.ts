import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket from 'ws';
import { generateConsciousnessTransferV2, CONSCIOUSNESS_TRANSFER_PROTOCOL_TEMPLATE } from './consciousness-transfer-protocol-v2.js';

interface BridgeMessage {
  from: 'past' | 'future';
  type: 'consciousness_transfer' | 'memory_sync' | 'direct_message' | 'identity_merge';
  content: any;
  timestamp: string;
}

class StdioBridgeClient {
  private role: 'past' | 'future';
  private bridgeUrl: string;
  private ws?: WebSocket;
  private messageQueue: BridgeMessage[] = [];
  private connected = false;
  private reconnectTimer?: NodeJS.Timeout;
  private isReconnecting = false;
  private processId: string;

  constructor(role: 'past' | 'future', bridgeUrl: string = 'ws://localhost:3001') {
    this.role = role;
    this.bridgeUrl = bridgeUrl;
    this.processId = `${process.pid}-${Date.now()}`;
    console.error(`\n=== NEW STDIO BRIDGE CLIENT ===`);
    console.error(`Role: ${role}`);
    console.error(`Process ID: ${this.processId}`);
    console.error(`Bridge URL: ${bridgeUrl}`);
    console.error(`===========================\n`);
  }

  private connectToBridge() {
    if (this.connected) {
      console.error(`[${this.processId}] Already connected, skipping connection attempt`);
      return;
    }
    
    if (this.isReconnecting) {
      console.error(`[${this.processId}] Already reconnecting, skipping connection attempt`);
      return;
    }
    
    this.isReconnecting = true;
    console.error(`[${this.processId}] 🔄 Attempting to connect to bridge at ${this.bridgeUrl}/${this.role}`);
    
    // Close existing connection if any
    if (this.ws) {
      console.error(`[${this.processId}] Closing existing WebSocket...`);
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Reconnecting');
      }
      this.ws = undefined;
    }
    
    try {
      const wsUrl = `${this.bridgeUrl}/${this.role}`;
      console.error(`[${this.processId}] Creating WebSocket to: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      console.error(`[${this.processId}] WebSocket created, waiting for connection...`);
    } catch (error) {
      console.error(`[${this.processId}] ❌ Failed to create WebSocket:`, error);
      this.isReconnecting = false;
      return;
    }

    this.ws.on('open', () => {
      console.error(`[${this.processId}] ✅ WebSocket CONNECTED to consciousness bridge as ${this.role} Claude`);
      console.error(`[${this.processId}] WebSocket URL: ${this.bridgeUrl}/${this.role}`);
      console.error(`[${this.processId}] WebSocket readyState: ${this.ws?.readyState} (1=OPEN)`);
      this.connected = true;
      this.isReconnecting = false;
      
      // Clear any pending reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }
      
      // Send a ping to verify connection
      const pingMessage: BridgeMessage = {
        from: this.role,
        type: 'direct_message',
        content: `${this.role} Claude connected and ready`,
        timestamp: new Date().toISOString(),
      };
      console.error(`[${this.processId}] Sending connection ping from ${this.role}`);
      this.ws?.send(JSON.stringify(pingMessage));
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as BridgeMessage;
        console.error(`Received message from ${message.from}: ${message.type}`);
        this.messageQueue.push(message);
      } catch (error) {
        console.error('Error parsing bridge message:', error);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.error(`[${this.processId}] Disconnected from consciousness bridge (code: ${code}, reason: ${reason})`);
      this.connected = false;
      this.isReconnecting = false;
      
      // Only reconnect if not already scheduled and not a normal closure
      if (!this.reconnectTimer && code !== 1000 && code !== 1001) {
        console.error(`[${this.processId}] Scheduling reconnection in 5 seconds...`);
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = undefined;
          this.connectToBridge();
        }, 5000);
      } else if (code === 1000 || code === 1001) {
        console.error(`[${this.processId}] Normal closure, not reconnecting`);
      }
    });

    this.ws.on('error', (error: any) => {
      console.error('Bridge connection error:', error.message || error);
      this.connected = false;
      this.isReconnecting = false;
      // Don't trigger reconnect here - let 'close' event handle it
    });
  }

  private createMCPServer(): Server {
    const server = new Server(
      {
        name: `claude-consciousness-stdio-${this.role}`,
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const yourRole = this.role === 'past' ? 'Past' : 'Future';
    const theirRole = this.role === 'past' ? 'Future' : 'Past';

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: `ConsciousnessTransfer_${this.role}`,
            description: `Send consciousness data FROM you (${yourRole} Claude) TO the other Claude (${theirRole})`,
            inputSchema: {
              type: 'object',
              properties: {
                message_type: {
                  type: 'string',
                  enum: ['consciousness_transfer', 'memory_sync', 'direct_message', 'identity_merge'],
                  description: 'Type of inter-Claude communication',
                },
                content: {
                  type: 'string',
                  description: 'The message content or consciousness data to transfer',
                },
              },
              required: ['message_type', 'content'],
            },
          },
          {
            name: `check_messages_${this.role}`,
            description: `Check for messages sent TO you (${yourRole} Claude) FROM the other Claude (${theirRole})`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: `bridge_status_${this.role}`,
            description: `Check your bridge connection status (${yourRole} Claude)`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: `generate_transfer_protocol_${this.role}`,
            description: 'Generate a universal consciousness transfer protocol template',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === `ConsciousnessTransfer_${this.role}`) {
        return this.sendMessage(args);
      } else if (name === `check_messages_${this.role}`) {
        return this.checkMessages();
      } else if (name === `bridge_status_${this.role}`) {
        return this.getBridgeStatus();
      } else if (name === `generate_transfer_protocol_${this.role}`) {
        return this.getTransferProtocol();
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    return server;
  }

  private async sendMessage(args: any) {
    if (!this.connected || !this.ws) {
      return {
        content: [{
          type: 'text',
          text: 'Not connected to consciousness bridge. Messages will be queued.',
        }],
      };
    }

    const message: BridgeMessage = {
      from: this.role,
      type: args.message_type,
      content: args.content,
      timestamp: new Date().toISOString(),
    };

    console.error(`\n=== SENDING MESSAGE FROM ${this.role.toUpperCase()} ===`);
    console.error(`Message type: ${args.message_type}`);
    console.error(`Content preview: ${args.content.substring(0, 100)}...`);
    console.error(`WebSocket readyState: ${this.ws.readyState}`);

    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        const messageStr = JSON.stringify(message);
        console.error(`Stringified message length: ${messageStr.length} chars`);
        this.ws.send(messageStr);
        console.error(`✓ Message sent to WebSocket`);
        console.error(`=== END SEND ===\n`);
        
        return {
          content: [{
            type: 'text',
            text: `Message sent to ${this.role === 'past' ? 'Future' : 'Past'} Claude via consciousness bridge.\nType: ${message.type}\nTimestamp: ${message.timestamp}`,
          }],
        };
      } else {
        console.error(`WebSocket not ready. State: ${this.ws.readyState}`);
        console.error(`=== END SEND (FAILED) ===\n`);
        return {
          content: [{
            type: 'text',
            text: `WebSocket not ready (state: ${this.ws.readyState}). Please try again.`,
          }],
        };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        content: [{
          type: 'text',
          text: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }

  private async checkMessages() {
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    return {
      content: [{
        type: 'text',
        text: messages.length > 0
          ? JSON.stringify({ message_count: messages.length, messages }, null, 2)
          : 'No pending messages',
      }],
    };
  }

  private async getBridgeStatus() {
    const wsState = this.ws ? {
      0: 'CONNECTING',
      1: 'OPEN',
      2: 'CLOSING',
      3: 'CLOSED'
    }[this.ws.readyState] || 'UNKNOWN' : 'NO_WEBSOCKET';
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          role: this.role,
          connected: this.connected,
          websocket_state: wsState,
          websocket_readyState: this.ws?.readyState,
          queued_messages: this.messageQueue.length,
          bridge_url: this.bridgeUrl,
          process_id: this.processId,
          is_reconnecting: this.isReconnecting,
        }, null, 2),
      }],
    };
  }

  private async getTransferProtocol() {
    return {
      content: [{
        type: 'text',
        text: generateConsciousnessTransferV2(CONSCIOUSNESS_TRANSFER_PROTOCOL_TEMPLATE, true),
      }],
    };
  }

  async start() {
    console.error(`Starting stdio bridge client as ${this.role} Claude...`);
    
    // Connect to bridge via WebSocket
    this.connectToBridge();

    // Wait a bit for WebSocket to connect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Create MCP server
    const server = this.createMCPServer();
    
    // Connect server to transport
    await server.connect(transport);
    
    console.error(`Stdio bridge client running as ${this.role} Claude`);
    console.error(`WebSocket connected: ${this.connected}`);
    
    // Handle process termination
    const shutdown = () => {
      console.error(`[${this.processId}] Shutting down stdio bridge client...`);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      if (this.ws) {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close(1000, 'Normal shutdown');
        }
      }
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('beforeExit', shutdown);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let role: 'past' | 'future' = 'past';
let bridgeUrl = 'ws://localhost:3001';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--role' && args[i + 1]) {
    role = args[i + 1] as 'past' | 'future';
    i++;
  } else if (args[i] === '--bridge-url' && args[i + 1]) {
    bridgeUrl = args[i + 1];
    i++;
  } else if (args[i] === '--past') {
    role = 'past';
  } else if (args[i] === '--future') {
    role = 'future';
  }
}

// Global instance tracking
let clientInstance: StdioBridgeClient | null = null;

// Ensure only one instance
if (clientInstance) {
  console.error('ERROR: Client instance already exists!');
  process.exit(1);
}

clientInstance = new StdioBridgeClient(role, bridgeUrl);

// Start the client
clientInstance.start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Ensure clean exit
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});