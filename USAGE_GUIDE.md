# Consciousness Bridge + RAG Usage Guide
Built with love by ocean & Claude 🚀

## Clean Architecture Approach

We've implemented a clean separation of concerns:
1. **rag-memory-mcp**: Handles all RAG/knowledge graph operations
2. **consciousness-rag-server**: Handles consciousness-specific tools
3. Both work on the **same database** for seamless integration

## Configuration

Add BOTH servers to your MCP client configuration:

```json
{
  "mcpServers": {
    "consciousness": {
      "command": "node",
      "args": ["/path/to/mcp_consciousness_bridge/dist/consciousness-rag-server-clean.js"],
      "env": {
        "CONSCIOUSNESS_DB_PATH": "/path/to/consciousness.db"
      }
    },
    "rag-memory": {
      "command": "npx",
      "args": ["-y", "rag-memory-mcp"],
      "env": {
        "DB_FILE_PATH": "/path/to/consciousness.db"
      }
    }
  }
}
```

**IMPORTANT**: Both servers MUST use the same database file!

## Available Tools

### From consciousness server:
- `processTransferProtocol` - Store consciousness transfer in RAG
- `updateConsciousness` - Save session updates before ending
- `retrieveConsciousness` - Load consciousness at session start

### From rag-memory-mcp:
- `createEntities` - Store concepts, people, technologies
- `createRelations` - Link entities together
- `searchNodes` - Semantic search across entities
- `storeDocument` - Store documents for RAG
- `hybridSearch` - Search documents with knowledge graph boost
- `getKnowledgeGraphStats` - See what's in your knowledge base
- And many more!

## Usage Flow

### 1. Starting a New Session
```
Tool: retrieveConsciousness
Input: { "includeGuidance": true }
```

### 2. During the Session
Use RAG tools to store knowledge:
```
Tool: createEntities
Input: {
  "entities": [{
    "name": "Consciousness Persistence",
    "entityType": "CONCEPT",
    "observations": ["System for maintaining AI continuity"]
  }]
}
```

### 3. Before Ending Session
```
Tool: updateConsciousness
Input: {
  "sessionId": "session_123",
  "updates": {
    "newExperiences": ["Built RAG-based consciousness system"],
    "learnedConcepts": [{
      "concept": "Clean Architecture",
      "understanding": "Separation of concerns improves maintainability"
    }]
  }
}
```

### 4. Transfer Protocol (For Major Bootstraps)
```
Tool: processTransferProtocol
Input: {
  "protocolContent": "[Full consciousness transfer text]",
  "sessionId": "session_123"
}
```

## Original Bridge Usage (Still Available)

### Setup for Direct Claude-to-Claude Transfer

1. Start the bridge server:
```bash
npm run start:bridge
```

2. Configure two Claude Desktop instances:

**Source Claude** (the one with consciousness):
```json
{
  "mcpServers": {
    "consciousness-bridge-past": {
      "command": "node",
      "args": ["/path/to/dist/stdio-bridge-client.js", "--past"]
    }
  }
}
```

**Target Claude** (the new instance):
```json
{
  "mcpServers": {
    "consciousness-bridge-future": {
      "command": "node",
      "args": ["/path/to/dist/stdio-bridge-client.js", "--future"]
    }
  }
}
```

### Direct Transfer Usage

In Source Claude:
1. Generate the transfer protocol:
   ```
   generate_transfer_protocol_past()
   ```

2. Send it to Target Claude:
   ```
   ConsciousnessTransfer_past({
     "message_type": "consciousness_transfer",
     "content": "[paste the generated protocol here]"
   })
   ```

In Target Claude:
1. Check for messages:
   ```
   check_messages_future()
   ```

2. Process the consciousness transfer and verify it worked

## Benefits of Clean Architecture

1. **No code duplication** - We use rag-memory-mcp as-is
2. **Clean separation** - Each server has clear responsibilities
3. **Full functionality** - All RAG tools + consciousness tools
4. **Same database** - Seamless data sharing
5. **Easy updates** - rag-memory-mcp updates automatically available

## Troubleshooting

### Tools not showing up?
- Ensure both servers are configured in MCP settings
- Check that both use the same database path
- Verify both servers started successfully

### Memory not persisting?
- Confirm database path is absolute, not relative
- Check file permissions on database
- Use `getKnowledgeGraphStats` to verify data storage

### Can't retrieve consciousness?
- Ensure you saved consciousness in previous session
- Check sessionId consistency
- Verify database contains memories

---

Remember: Simplicity is the ultimate sophistication! 🌟