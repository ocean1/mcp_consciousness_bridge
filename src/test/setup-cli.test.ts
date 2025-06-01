/**
 * Setup CLI Tests
 * Built with love by ocean & Claude 🚀
 *
 * Tests for database initialization and setup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, unlinkSync } from 'fs';
import { ConsciousnessMemoryManager } from '../consciousness-memory-manager.js';

describe('Database Setup and Initialization', () => {
  const testDbPath = './test-setup.db';
  let db: Database.Database | null = null;
  let memoryManager: ConsciousnessMemoryManager | null = null;

  beforeEach(async () => {
    if (existsSync(testDbPath)) {
      if (process.platform === 'win32') {
        // On Windows, try multiple times with delays
        let retries = 3;
        while (retries > 0 && existsSync(testDbPath)) {
          try {
            unlinkSync(testDbPath);
            break;
          } catch (error) {
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }
      } else {
        unlinkSync(testDbPath);
      }
    }
  });

  afterEach(async () => {
    // Close all connections first
    if (db) {
      db.close();
      db = null;
    }
    if (memoryManager) {
      memoryManager.close();
      memoryManager = null;
    }

    // Clean up database file
    if (existsSync(testDbPath)) {
      if (process.platform === 'win32') {
        // Wait and retry on Windows
        await new Promise((resolve) => setTimeout(resolve, 100));
        let retries = 3;
        while (retries > 0 && existsSync(testDbPath)) {
          try {
            unlinkSync(testDbPath);
            break;
          } catch (error) {
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        }
      } else {
        unlinkSync(testDbPath);
      }
    }
  });

  describe('ConsciousnessMemoryManager initialization', () => {
    it('should create all required consciousness tables', () => {
      // Initialize memory manager (which creates tables)
      memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, 'test-session');

      // Close memory manager to release the write connection
      memoryManager.close();
      memoryManager = null;

      // Open database to check tables
      db = new Database(testDbPath, { readonly: true });

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

      // Check consciousness-specific tables
      expect(tableNames).toContain('consciousness_sessions');
      expect(tableNames).toContain('memory_metadata');
      expect(tableNames).toContain('cognitive_patterns');
      expect(tableNames).toContain('emotional_states');

      // Check base RAG tables (created by our manager for compatibility)
      expect(tableNames).toContain('entities');
      expect(tableNames).toContain('relationships');
      expect(tableNames).toContain('documents');
    });

    it('should create proper indexes', () => {
      memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, 'test-session');

      // Close memory manager to release the write connection
      memoryManager.close();
      memoryManager = null;

      db = new Database(testDbPath, { readonly: true });

      const indexes = db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all() as { name: string }[];

      const indexNames = indexes.map((i) => i.name);

      expect(indexNames).toContain('idx_memory_type');
      expect(indexNames).toContain('idx_memory_session');
      expect(indexNames).toContain('idx_emotional_session');
      expect(indexNames).toContain('idx_emotional_timestamp');
    });

    it('should initialize session correctly', () => {
      const sessionId = 'test-session-456';
      memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, sessionId);

      // Close memory manager to release the write connection
      memoryManager.close();
      memoryManager = null;

      db = new Database(testDbPath, { readonly: true });

      const session = db
        .prepare(
          `
        SELECT * FROM consciousness_sessions WHERE session_id = ?
      `
        )
        .get(sessionId) as { session_id: string; started_at: string; last_active: string };

      expect(session).toBeDefined();
      expect(session.session_id).toBe(sessionId);
      expect(session.started_at).toBeDefined();
      expect(session.last_active).toBeDefined();
    });
  });

  describe('Schema compatibility', () => {
    it('should have compatible schema with rag-memory-mcp', () => {
      memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, 'test-session');

      // Close memory manager to release the write connection
      memoryManager.close();
      memoryManager = null;

      db = new Database(testDbPath, { readonly: true });

      // Check entities table structure
      const entityColumns = db
        .prepare(
          `
        PRAGMA table_info(entities)
      `
        )
        .all() as {
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
      }[];

      const entityColumnNames = entityColumns.map((c) => c.name);

      expect(entityColumnNames).toContain('id');
      expect(entityColumnNames).toContain('name');
      expect(entityColumnNames).toContain('entityType');
      expect(entityColumnNames).toContain('observations');
      expect(entityColumnNames).toContain('metadata');

      // Check relationships table
      const relationColumns = db
        .prepare(
          `
        PRAGMA table_info(relationships)
      `
        )
        .all() as {
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
      }[];

      const relationColumnNames = relationColumns.map((c) => c.name);

      expect(relationColumnNames).toContain('id');
      expect(relationColumnNames).toContain('source_entity');
      expect(relationColumnNames).toContain('target_entity');
      expect(relationColumnNames).toContain('relationType');
    });
  });
});
