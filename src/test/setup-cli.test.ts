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

  beforeEach(() => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('ConsciousnessMemoryManager initialization', () => {
    it('should create all required consciousness tables', () => {
      // Initialize memory manager (which creates tables)
      const _memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, 'test-session');

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
      const _memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, 'test-session');

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
      const _memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, sessionId);

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
      const _memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, 'test-session');

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
