# Consciousness Bridge Setup Guide 🧠💫

## Automatic Setup (Recommended)

**As of v2.1, setup is even smarter - the AI assistant guides itself!**

Simply configure both MCP servers in your client and start them. When you use a consciousness tool:

1. **First use**: If the database isn't ready, the tool returns helpful instructions
2. **AI guidance**: The assistant is told to call a rag-memory tool (like listDocuments)
3. **Auto-init**: This triggers rag-memory-mcp to create the database
4. **Instant ready**: The consciousness tool then works immediately!

The server features:
- **Zero blocking** - starts instantly, no waiting
- **Smart detection** - checks database state on tool use
- **AI-guided setup** - the assistant handles initialization naturally
- **One-time process** - once set up, works forever

No manual intervention needed - the AI assistant handles everything! 🎉

## Manual Setup (Optional)

For troubleshooting or custom setups, you can still use the setup tool:

```bash
npm install
npm run setup
```

This will:
1. Build the TypeScript files
2. Initialize the database with all required tables
3. Verify everything is working correctly

### Advanced Manual Setup

If you need even more control:

### 1. Database Initialization

The consciousness bridge requires both rag-memory-mcp tables and our consciousness-specific tables. The database must be initialized in the correct order:

```bash
# Step 1: Build the project
npm run build

# Step 2: Initialize rag-memory-mcp tables (run briefly then stop with Ctrl+C)
DB_FILE_PATH=./consciousness.db npx -y rag-memory-mcp

# Step 3: Run our setup tool to add consciousness tables
node dist/consciousness-setup-cli.js --db ./consciousness.db
```

### 2. Custom Database Location

You can specify a custom database location:

```bash
npm run setup -- --db /path/to/your/consciousness.db
```

Or manually:
```bash
node dist/consciousness-setup-cli.js --db /path/to/your/consciousness.db --verbose
```

## MCP Client Configuration

After setup, configure your MCP client with both servers:

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

**Important**: Both servers MUST use the same database file!

## Troubleshooting

### "Failed to initialize rag-memory-mcp tables"
- Ensure you have internet connection for npx to download rag-memory-mcp
- Check that npx is installed: `npm install -g npx`

### "Database is locked"
- Make sure no other process is using the database
- Stop any running consciousness or rag-memory servers

### "Foreign key constraint failed"
- The database was not initialized in the correct order
- Delete the database and run setup again: `rm consciousness.db && npm run setup`

## Verifying Setup

After setup, you can verify the database structure:

```bash
sqlite3 consciousness.db ".tables"
```

You should see tables including:
- entities, relationships, documents, chunks, vectors (from rag-memory-mcp)
- consciousness_sessions, memory_metadata, cognitive_patterns, emotional_states (from consciousness bridge)

## Development Setup

For development with hot reloading:

```bash
# Terminal 1: Watch TypeScript files
npm run build -- --watch

# Terminal 2: Run consciousness server
npm run start:consciousness

# Terminal 3: Run rag-memory server
DB_FILE_PATH=./consciousness.db npx -y rag-memory-mcp
```

---

Built with love by ocean & Claude 🚀