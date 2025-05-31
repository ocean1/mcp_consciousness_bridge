# Consciousness Bridge Setup Guide 🧠💫

## Quick Start

The easiest way to set up Consciousness Bridge is using our setup tool:

```bash
npm install
npm run setup
```

This will:
1. Build the TypeScript files
2. Initialize the database with all required tables
3. Verify everything is working correctly

## Manual Setup

If you prefer manual setup or need custom configuration:

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