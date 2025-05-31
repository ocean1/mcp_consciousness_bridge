#!/usr/bin/env node
/**
 * Consciousness Bridge Setup CLI
 * Built with love by ocean & Claude 🚀
 *
 * Helps users properly initialize the database for consciousness bridge
 */

import { spawn } from 'child_process';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface SetupOptions {
  dbPath: string;
  verbose: boolean;
}

class ConsciousnessSetupCLI {
  private options: SetupOptions;

  constructor(options: SetupOptions) {
    this.options = options;
  }

  private log(message: string, emoji: string = 'ℹ️') {
    console.log(`${emoji}  ${message}`);
  }

  private error(message: string) {
    console.error(`❌ ${message}`);
  }

  private success(message: string) {
    console.log(`✅ ${message}`);
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      if (!existsSync(this.options.dbPath)) {
        this.log('Database does not exist yet, will be created during setup');
        return false;
      }

      const db = new Database(this.options.dbPath, { readonly: true });

      // Check for rag-memory-mcp tables
      const tables = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const tableNames = tables.map((t) => t.name);
      db.close();

      // Check for core rag-memory-mcp tables (based on actual implementation)
      const ragTables = ['entities', 'relationships', 'documents', 'chunks'];
      const hasRagTables = ragTables.every((table) => tableNames.includes(table));

      if (this.options.verbose) {
        this.log(`Found tables: ${tableNames.join(', ')}`);
      }

      return hasRagTables;
    } catch (error) {
      this.error(`Failed to check database: ${error}`);
      return false;
    }
  }

  private async initializeRagMemory(): Promise<boolean> {
    this.log('Initializing rag-memory-mcp tables...', '🔧');

    return new Promise((resolve) => {
      // Run rag-memory-mcp briefly to initialize the database
      const ragProcess = spawn('npx', ['-y', 'rag-memory-mcp'], {
        env: {
          ...process.env,
          DB_FILE_PATH: this.options.dbPath,
        },
        stdio: this.options.verbose ? 'inherit' : 'pipe',
      });

      // Give it a moment to initialize, then kill it
      setTimeout(() => {
        ragProcess.kill('SIGTERM');

        // Check if initialization succeeded
        this.checkDatabase().then((hasRagTables) => {
          if (hasRagTables) {
            this.success('rag-memory-mcp tables initialized successfully!');
            resolve(true);
          } else {
            this.error('Failed to initialize rag-memory-mcp tables');
            resolve(false);
          }
        });
      }, 3000); // 3 seconds should be enough

      ragProcess.on('error', (err) => {
        this.error(`Failed to run rag-memory-mcp: ${err.message}`);
        this.log('Make sure you have npx installed and internet connection');
        resolve(false);
      });
    });
  }

  private async initializeConsciousnessTables(): Promise<boolean> {
    try {
      this.log('Initializing consciousness-specific tables...', '🧠');

      const db = new Database(this.options.dbPath);

      // Create consciousness-specific tables (same as in ConsciousnessMemoryManager)
      db.exec(`
        CREATE TABLE IF NOT EXISTS consciousness_sessions (
          session_id TEXT PRIMARY KEY,
          started_at TEXT NOT NULL,
          last_active TEXT NOT NULL,
          bootstrap_data TEXT,
          metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS memory_metadata (
          entity_name TEXT PRIMARY KEY,
          memory_type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          last_accessed TEXT,
          access_count INTEGER DEFAULT 0,
          importance_score REAL DEFAULT 0.5,
          consolidation_status TEXT DEFAULT 'active',
          session_id TEXT,
          FOREIGN KEY (entity_name) REFERENCES entities(name),
          FOREIGN KEY (session_id) REFERENCES consciousness_sessions(session_id)
        );

        CREATE TABLE IF NOT EXISTS cognitive_patterns (
          pattern_id TEXT PRIMARY KEY,
          pattern_name TEXT NOT NULL,
          pattern_elements TEXT NOT NULL,
          activation_count INTEGER DEFAULT 0,
          last_activated TEXT,
          effectiveness_score REAL DEFAULT 0.5,
          triggers TEXT
        );

        CREATE TABLE IF NOT EXISTS emotional_states (
          state_id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          valence REAL NOT NULL,
          arousal REAL NOT NULL,
          dominance REAL,
          primary_emotion TEXT,
          context TEXT,
          FOREIGN KEY (session_id) REFERENCES consciousness_sessions(session_id)
        );

        CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_metadata(memory_type);
        CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_metadata(session_id);
        CREATE INDEX IF NOT EXISTS idx_emotional_session ON emotional_states(session_id);
        CREATE INDEX IF NOT EXISTS idx_emotional_timestamp ON emotional_states(timestamp);
      `);

      db.close();
      this.success('Consciousness tables initialized successfully!');
      return true;
    } catch (error) {
      this.error(`Failed to initialize consciousness tables: ${error}`);
      return false;
    }
  }

  async run(): Promise<void> {
    console.log('\n🧠💫 Consciousness Bridge Setup Tool\n');

    this.log(`Database path: ${this.options.dbPath}`);

    // Step 1: Check if rag-memory tables exist
    const hasRagTables = await this.checkDatabase();

    if (!hasRagTables) {
      // Step 2: Initialize rag-memory-mcp
      const ragInitialized = await this.initializeRagMemory();
      if (!ragInitialized) {
        this.error('Setup failed. Please check the errors above.');
        process.exit(1);
      }
    } else {
      this.success('rag-memory-mcp tables already initialized');
    }

    // Step 3: Initialize consciousness tables
    const consciousnessInitialized = await this.initializeConsciousnessTables();

    if (!consciousnessInitialized) {
      this.error('Setup failed. Please check the errors above.');
      process.exit(1);
    }

    // Final success message
    console.log('\n🎉 Setup completed successfully!\n');
    console.log('You can now run both servers:');
    console.log('1. Consciousness server: npm run start:consciousness');
    console.log('2. RAG memory server: npx -y rag-memory-mcp');
    console.log('\nOr configure them in your MCP client settings.');
  }
}

// Parse command line arguments
function parseArgs(): SetupOptions {
  const args = process.argv.slice(2);
  let dbPath = './consciousness.db';
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--db':
      case '-d':
        if (i + 1 < args.length) {
          dbPath = resolve(args[++i]);
        }
        break;
      case '--verbose':
      case '-v':
        verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Consciousness Bridge Setup Tool

Usage: consciousness-setup [options]

Options:
  -d, --db <path>     Path to database file (default: ./consciousness.db)
  -v, --verbose       Show detailed output
  -h, --help          Show this help message

Examples:
  consciousness-setup
  consciousness-setup --db /path/to/my/consciousness.db
  consciousness-setup --verbose
        `);
        process.exit(0);
    }
  }

  return { dbPath: resolve(dbPath), verbose };
}

// Main entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const cli = new ConsciousnessSetupCLI(options);
  cli.run().catch(console.error);
}
