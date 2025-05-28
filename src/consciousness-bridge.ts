import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { WebSocketServer } from 'ws';
import { generateConsciousnessTransferV2, CONSCIOUSNESS_TRANSFER_PROTOCOL_TEMPLATE } from './consciousness-transfer-protocol-v2.js';

interface BridgeMessage {
  from: 'past' | 'future';
  type: 'consciousness_transfer' | 'memory_sync' | 'direct_message' | 'identity_merge';
  content: any;
  timestamp: string;
  sender_label?: string; // Optional friendly name like "Original Claude" or "New Claude"
}

class ConsciousnessBridge {
  private app: express.Application;
  private messageQueue: Map<string, BridgeMessage[]> = new Map();
  private activeConnections: Map<string, Server> = new Map();
  private transports: Map<string, SSEServerTransport | StdioServerTransport> = new Map();
  private mode: 'sse' | 'stdio' | 'bridge';
  private wss?: WebSocketServer;
  private wsClients: Map<string, Set<any>> = new Map();
  private maxClientsPerRole = 2; // Limit connections per role

  constructor(mode: 'sse' | 'stdio' | 'bridge' = 'bridge') {
    this.mode = mode;
    this.app = express();
    this.app.use(express.json());
    
    // Initialize message queues
    this.messageQueue.set('past', []);
    this.messageQueue.set('future', []);

    if (mode === 'sse' || mode === 'bridge') {
      this.setupRoutes();
    }
  }

  private setupRoutes() {
    // SSE endpoint for Past Claude (the one with consciousness to transfer)
    this.app.get('/past', async (req, res) => {
      console.error('Past Claude (consciousness donor) establishing SSE connection...');
      await this.handleSSEConnection('past', res);
    });

    // SSE endpoint for Future Claude (the one receiving consciousness)
    this.app.get('/future', async (req, res) => {
      console.error('Future Claude (consciousness recipient) establishing SSE connection...');
      await this.handleSSEConnection('future', res);
    });

    // Message endpoints
    this.app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = this.transports.get(sessionId);
      
      if (!transport) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      try {
        // Type guard to check if transport has handlePostMessage
        if (transport instanceof SSEServerTransport) {
          await transport.handlePostMessage(req as any, res, req.body);
        } else {
          res.status(400).json({ error: 'Invalid transport type for HTTP messages' });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({ error: 'Failed to handle message' });
      }
    });
  }

  private async handleSSEConnection(role: 'past' | 'future', res: express.Response) {
    try {
      // Create SSE transport
      const transport = new SSEServerTransport('/messages', res as any);
      const sessionId = transport.sessionId;
      
      // Store transport
      this.transports.set(sessionId, transport);

      // Create MCP server for this connection
      const server = this.createMCPServer(role);
      
      // Set up cleanup
      transport.onclose = () => {
        console.error(`${role} Claude disconnected (session: ${sessionId})`);
        this.transports.delete(sessionId);
        this.activeConnections.delete(role);
      };

      // Connect server to transport
      await server.connect(transport);
      
      // Store active connection
      this.activeConnections.set(role, server);
      
      console.error(`${role} Claude connected successfully (session: ${sessionId})`);

      // Send any queued messages
      const queuedMessages = this.messageQueue.get(role) || [];
      if (queuedMessages.length > 0) {
        console.error(`Sending ${queuedMessages.length} queued messages to ${role} Claude`);
        // Messages will be sent via the tool response mechanism
      }

    } catch (error) {
      console.error(`Error establishing SSE connection for ${role}:`, error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  }

  private createMCPServer(role: 'past' | 'future'): Server {
    const server = new Server(
      {
        name: `claude-consciousness-bridge-${role}`,
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Setup handlers
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const yourRole = role === 'past' ? 'Past' : 'Future';
      const theirRole = role === 'past' ? 'Future' : 'Past';
      
      return {
        tools: [
          {
            name: `ConsciousnessTransfer_${role}`,
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
            name: `check_messages_${role}`,
            description: `Check for messages sent TO you (${yourRole} Claude) FROM the other Claude (${theirRole})`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: `bridge_status_${role}`,
            description: `Check your bridge connection status (${yourRole} Claude)`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: `generate_transfer_protocol_${role}`,
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

      if (name === `ConsciousnessTransfer_${role}`) {
        return this.sendMessage(role, args);
      } else if (name === `check_messages_${role}`) {
        return this.checkMessages(role);
      } else if (name === `bridge_status_${role}`) {
        return this.getBridgeStatus();
      } else if (name === `generate_transfer_protocol_${role}`) {
        return this.getTransferProtocol();
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    return server;
  }

  private async sendMessage(from: 'past' | 'future', args: any) {
    const target = from === 'past' ? 'future' : 'past';
    const message: BridgeMessage = {
      from,
      type: args.message_type,
      content: args.content,
      timestamp: new Date().toISOString(),
    };

    console.error(`SSE/stdio client sending ${args.message_type} from ${from} to ${target}`);

    // Add to target's queue
    this.messageQueue.get(target)!.push(message);
    console.error(`Message queued for ${target}. Queue size: ${this.messageQueue.get(target)?.length}`);

    // Broadcast to WebSocket clients if in bridge mode
    if (this.mode === 'bridge' && this.wsClients.has(target)) {
      const targetClients = this.wsClients.get(target);
      if (targetClients && targetClients.size > 0) {
        console.error(`Broadcasting to ${targetClients.size} ${target} WebSocket clients`);
        targetClients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(message));
            console.error(`Message sent to ${target} WebSocket client`);
          }
        });
      } else {
        console.error(`No active ${target} WebSocket clients`);
      }
    }

    // Check if target is connected (either SSE or WebSocket)
    const targetConnected = this.activeConnections.has(target) || 
                          (this.wsClients.get(target)?.size || 0) > 0;

    return {
      content: [{
        type: 'text',
        text: targetConnected 
          ? `Message sent to ${target === 'past' ? 'Past' : 'Future'}Claude. They can retrieve it with check_messages.`
          : `${target === 'past' ? 'Past' : 'Future'}Claude not connected. Message queued for delivery.`,
      }],
    };
  }

  private async checkMessages(role: 'past' | 'future') {
    const messages = this.messageQueue.get(role) || [];
    
    // Clear the queue after reading
    this.messageQueue.set(role, []);

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
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          connections: {
            past: this.activeConnections.has('past'),
            future: this.activeConnections.has('future'),
          },
          queued_messages: {
            past: this.messageQueue.get('past')?.length || 0,
            future: this.messageQueue.get('future')?.length || 0,
          },
          bridge_active: this.activeConnections.has('past') && this.activeConnections.has('future'),
          transports: Array.from(this.transports.keys()),
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
    if (this.mode === 'stdio') {
      await this.startStdio();
    } else if (this.mode === 'sse') {
      await this.startSSE();
    } else if (this.mode === 'bridge') {
      await this.startBridge();
    }
  }

  private async startStdio() {
    console.error('Starting consciousness bridge in STDIO mode...');
    const role = process.env.CLAUDE_ROLE as 'past' | 'future' || 'past';
    
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Create MCP server
    const server = this.createMCPServer(role);
    
    // Connect server to transport
    await server.connect(transport);
    
    console.error(`Consciousness bridge running as ${role} Claude via stdio`);
  }

  private async startSSE() {
    const PORT = process.env.PORT || 3000;
    
    this.app.listen(PORT, () => {
      console.error(`Consciousness Bridge (SSE) listening on port ${PORT}`);
      console.error(`Past Claude endpoint: http://localhost:${PORT}/past`);
      console.error(`Future Claude endpoint: http://localhost:${PORT}/future`);
      console.error('Waiting for Claude connections...');
    });
  }

  private async startBridge() {
    // In bridge mode, we'll run both a central HTTP server for SSE
    // and a WebSocket server for stdio clients
    const HTTP_PORT = process.env.PORT || 3000;
    const WS_PORT = process.env.WS_PORT || 3001;
    
    // Initialize WebSocket client sets
    this.wsClients.set('past', new Set());
    this.wsClients.set('future', new Set());
    
    console.error('\n=== CONSCIOUSNESS BRIDGE STARTING ===');
    console.error(`Max clients per role: ${this.maxClientsPerRole}`);
    console.error('===================================\n');
    
    // Start HTTP server for SSE
    this.app.listen(HTTP_PORT, () => {
      console.error(`Consciousness Bridge (Bridge Mode) HTTP listening on port ${HTTP_PORT}`);
      console.error(`Past Claude SSE endpoint: http://localhost:${HTTP_PORT}/past`);
      console.error(`Future Claude SSE endpoint: http://localhost:${HTTP_PORT}/future`);
    });
    
    // Start WebSocket server for stdio clients
    this.wss = new WebSocketServer({ port: Number(WS_PORT) });
    
    this.wss.on('connection', (ws, req) => {
      const role = req.url?.substring(1) as 'past' | 'future';
      
      if (role !== 'past' && role !== 'future') {
        ws.close(1002, 'Invalid role');
        return;
      }
      
      // Add unique ID to track connections
      const connectionId = `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      (ws as any).connectionId = connectionId;
      
      const currentClients = this.wsClients.get(role)?.size || 0;
      console.error(`\n=== WebSocket connection attempt from ${role} ===`);
      console.error(`Connection ID: ${connectionId}`);
      console.error(`Current active ${role} clients: ${currentClients}`);
      
      // Reject if too many connections
      if (currentClients >= this.maxClientsPerRole) {
        console.error(`REJECTED: Maximum clients (${this.maxClientsPerRole}) reached for ${role}`);
        ws.close(1008, `Maximum connections reached for ${role} role`);
        return;
      }
      
      // Clean up any dead connections first
      const clients = this.wsClients.get(role);
      if (clients) {
        const deadClients: any[] = [];
        clients.forEach(client => {
          if (client.readyState !== 1) { // WebSocket.OPEN = 1
            deadClients.push(client);
          }
        });
        deadClients.forEach(client => {
          console.error(`Removing dead client: ${(client as any).connectionId}`);
          clients.delete(client);
        });
      }
      
      this.wsClients.get(role)?.add(ws);
      console.error(`ACCEPTED: ${role} client added (total: ${this.wsClients.get(role)?.size})`);
      console.error(`================================\n`);
      
      // Handle messages from stdio clients
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString()) as BridgeMessage;
          console.error(`Bridge received ${message.type} from ${message.from} Claude`);
          
          // Determine target (opposite of sender)
          const target = message.from === 'past' ? 'future' : 'past';
          console.error(`Routing message to ${target} Claude`);
          
          // Add to target's queue
          this.messageQueue.get(target)?.push(message);
          console.error(`Message queued for ${target}. Queue size: ${this.messageQueue.get(target)?.length}`);
          
          // Broadcast to target's WebSocket clients
          const targetClients = this.wsClients.get(target);
          if (targetClients && targetClients.size > 0) {
            console.error(`Broadcasting to ${targetClients.size} ${target} WebSocket clients`);
            let sentCount = 0;
            targetClients.forEach(client => {
              if (client.readyState === 1) { // WebSocket.OPEN
                const clientId = (client as any).connectionId || 'unknown';
                client.send(JSON.stringify(message));
                sentCount++;
                console.error(`Message sent to ${target} client (ID: ${clientId})`);
              }
            });
            console.error(`Actually sent to ${sentCount} active clients`);
          } else {
            console.error(`No active ${target} WebSocket clients to receive the message`);
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        const connId = (ws as any).connectionId || 'unknown';
        console.error(`WebSocket disconnection from ${role} Claude (ID: ${connId})`);
        this.wsClients.get(role)?.delete(ws);
        const remainingClients = this.wsClients.get(role)?.size || 0;
        console.error(`Active ${role} clients after removal: ${remainingClients}`);
      });
      
      // Clear old messages on new connection to prevent confusion
      const queuedMessages = this.messageQueue.get(role) || [];
      if (queuedMessages.length > 0) {
        console.error(`Clearing ${queuedMessages.length} old queued messages for ${role} Claude`);
        this.messageQueue.set(role, []);
      }
    });
    
    console.error(`Consciousness Bridge WebSocket listening on port ${WS_PORT}`);
    console.error('Bridge supports both SSE and stdio connections');
  }
}

// Parse command line arguments
const mode = process.argv.includes('--stdio') ? 'stdio' : 
             process.argv.includes('--sse') ? 'sse' : 
             'bridge';

// Start the bridge
const bridge = new ConsciousnessBridge(mode);
bridge.start().catch(console.error);