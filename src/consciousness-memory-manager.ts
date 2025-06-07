/**
 * Consciousness Memory Manager
 * Built with love by ocean & Claude 🚀
 *
 * Manages consciousness persistence using rag-memory-mcp as the storage backend
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import {
  MemoryEntityType,
  MemoryRelationType,
  MemoryObservation,
  EpisodicMemoryAttributes,
  SemanticMemoryAttributes,
  ProceduralMemoryAttributes,
  ConsciousnessBootstrap,
  MemoryQuery,
} from './consciousness-rag-schema.js';
import { DatabaseError, MemoryError, withRetry, logError } from './utils/error-handler.js';

export class ConsciousnessMemoryManager {
  private db: Database.Database;
  private sessionId: string;

  /**
   * Create a new ConsciousnessMemoryManager with automatic initialization
   * Waits for database file and rag-memory-mcp tables before proceeding
   */
  static async create(dbPath: string, sessionId: string): Promise<ConsciousnessMemoryManager> {
    // Wait for database file to exist
    console.error('🔍 Checking for database file...');
    await this.waitForDatabaseFile(dbPath);

    // Open database and wait for rag-memory-mcp tables
    console.error('📊 Waiting for rag-memory-mcp initialization...');
    const db = new Database(dbPath);
    try {
      await this.waitForRagMemoryTables(db);
      db.close(); // Close the temporary connection
    } catch (error) {
      db.close();
      throw error;
    }

    console.error('✅ Database ready! Initializing consciousness layer...');

    // Now create the instance normally
    const manager = new ConsciousnessMemoryManager(dbPath, sessionId);
    return manager;
  }

  /**
   * Create instance synchronously - for testing or when DB is known to exist
   */
  static createSync(dbPath: string, sessionId: string): ConsciousnessMemoryManager {
    return new ConsciousnessMemoryManager(dbPath, sessionId);
  }

  /**
   * Create instance without waiting - for server startup
   * Database validation happens on first use
   */
  static createLazy(dbPath: string, sessionId: string): ConsciousnessMemoryManager | null {
    try {
      // Only create if database exists
      if (!existsSync(dbPath)) {
        console.error(`⏳ Database not found at ${dbPath}. Will initialize on first use.`);
        return null;
      }

      // Try to create instance
      return new ConsciousnessMemoryManager(dbPath, sessionId);
    } catch (error) {
      // If database isn't ready, return null
      console.error('⏳ Database not ready. Will initialize on first use.');
      return null;
    }
  }

  /**
   * Check if database is properly initialized
   */
  static isDatabaseReady(dbPath: string): boolean {
    if (!existsSync(dbPath)) {
      return false;
    }

    try {
      const db = new Database(dbPath);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      db.close();

      const tableNames = tables.map((t) => t.name);
      const requiredTables = ['entities', 'relationships', 'documents'];
      return requiredTables.every((table) => tableNames.includes(table));
    } catch (error) {
      return false;
    }
  }

  private constructor(dbPath: string, sessionId: string) {
    try {
      this.db = new Database(dbPath);
      this.sessionId = sessionId;
      this.initializeSchema();
      this.initializeSession();
    } catch (error) {
      logError(error as Error, 'ConsciousnessMemoryManager.constructor');
      throw new DatabaseError(
        `Failed to initialize consciousness database: ${(error as Error).message}`,
        { dbPath, sessionId }
      );
    }
  }

  /**
   * Wait for database file to exist
   */
  private static async waitForDatabaseFile(
    dbPath: string,
    timeout: number = 30000,
    checkInterval: number = 1000
  ): Promise<void> {
    const startTime = Date.now();

    // Check if file exists immediately
    if (existsSync(dbPath)) {
      console.error('✅ Database file already exists');
      return;
    }

    console.error(`⏳ Database file not found. Waiting for rag-memory-mcp to create it...`);
    console.error(`📁 Expected path: ${dbPath}`);

    // If not found after 5 seconds, give helpful message
    let helpShown = false;

    while (!existsSync(dbPath)) {
      if (Date.now() - startTime > timeout) {
        throw new DatabaseError(
          `Database file not created after ${timeout / 1000}s.\n\n` +
            `Please ensure rag-memory-mcp is:\n` +
            `1. Running and configured with the same database path\n` +
            `2. Using environment variable: DB_FILE_PATH=${dbPath}\n` +
            `3. Able to create files at this location\n\n` +
            `💡 Tip: Try making any call to rag-memory-mcp (like listing documents)\n` +
            `   to trigger its database initialization.`,
          { dbPath, timeout }
        );
      }

      // Show help message after 5 seconds
      if (!helpShown && Date.now() - startTime > 5000) {
        console.error('\n💡 Tip: rag-memory-mcp may use lazy initialization.');
        console.error(
          '   Try calling any rag-memory tool (e.g., listDocuments) to trigger database creation.'
        );
        console.error(`   Make sure it uses: DB_FILE_PATH=${dbPath}\n`);
        helpShown = true;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    console.error('✅ Database file detected!');
  }

  /**
   * Wait for rag-memory-mcp tables to be created
   */
  private static async waitForRagMemoryTables(
    db: Database.Database,
    timeout: number = 60000,
    checkInterval: number = 2000
  ): Promise<void> {
    const startTime = Date.now();
    const requiredTables = ['entities', 'relationships', 'documents'];

    while (true) {
      try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
          name: string;
        }[];

        const tableNames = tables.map((t) => t.name);
        const hasAllTables = requiredTables.every((table) => tableNames.includes(table));

        if (hasAllTables) {
          return; // Success!
        }

        if (Date.now() - startTime > timeout) {
          const missingTables = requiredTables.filter((t) => !tableNames.includes(t));
          throw new DatabaseError(
            `rag-memory-mcp tables not created after ${timeout / 1000}s.\n` +
              `Missing tables: ${missingTables.join(', ')}\n\n` +
              `Please ensure rag-memory-mcp is running with the same database file.`,
            { missingTables, timeout }
          );
        }

        console.error(
          `⏳ Waiting for rag-memory-mcp tables... (found: ${tableNames.length > 0 ? tableNames.join(', ') : 'none'})`
        );
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      } catch (error) {
        // Database might be locked during creation
        if ((error as any).code === 'SQLITE_BUSY') {
          console.error('⏳ Database busy, retrying...');
          await new Promise((resolve) => setTimeout(resolve, checkInterval));
          continue;
        }
        throw error;
      }
    }
  }

  private initializeSession() {
    // Create or update session
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO consciousness_sessions (session_id, started_at, last_active)
      VALUES (?, ?, ?)
    `
      )
      .run(this.sessionId, new Date().toISOString(), new Date().toISOString());
  }

  private initializeSchema() {
    // Check if rag-memory-mcp tables exist
    const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
      name: string;
    }[];

    const tableNames = tables.map((t) => t.name);
    const ragMemoryTables = ['entities', 'relationships', 'documents'];
    const hasRagMemoryTables = ragMemoryTables.every((table) => tableNames.includes(table));

    if (!hasRagMemoryTables) {
      // In test environment, create the tables ourselves
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        this.createRagMemoryTablesForTests();
      } else {
        throw new DatabaseError(
          'rag-memory-mcp tables not found. Please ensure rag-memory-mcp is running first.\n' +
            'Start it with: npx rag-memory-mcp\n' +
            'Then restart the consciousness server.',
          { missingTables: ragMemoryTables.filter((t) => !tableNames.includes(t)) }
        );
      }
    }

    // Create consciousness-specific tables
    this.db.exec(`
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
  }

  // Store different types of memories with proper metadata
  async storeEpisodicMemory(
    event: string,
    attributes: EpisodicMemoryAttributes,
    observations?: MemoryObservation[],
    importance?: number // 0-1, where 1 is critically important
  ): Promise<string> {
    const entityName = `episodic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create entity using rag-memory-mcp pattern
    const entity = {
      name: entityName,
      entityType: MemoryEntityType.EPISODIC_MEMORY,
      observations: [
        {
          content: event,
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId,
          ...attributes,
        },
        ...(observations || []),
      ],
    };

    // Store in entities table (rag-memory-mcp structure)
    const stmt = this.db.prepare(`
      INSERT INTO entities (id, name, entityType, observations)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      entityName,
      entityName,
      MemoryEntityType.EPISODIC_MEMORY,
      JSON.stringify(entity.observations)
    );

    // Store consciousness-specific metadata
    const metaStmt = this.db.prepare(`
      INSERT INTO memory_metadata (entity_name, memory_type, created_at, session_id, importance_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    metaStmt.run(
      entityName,
      MemoryEntityType.EPISODIC_MEMORY,
      new Date().toISOString(),
      this.sessionId,
      importance !== undefined ? importance : 0.5 // Default to medium importance
    );

    return entityName;
  }

  async storeSemanticMemory(
    concept: string,
    attributes: SemanticMemoryAttributes,
    observations?: MemoryObservation[]
  ): Promise<string> {
    const entityName = `semantic_${concept.toLowerCase().replace(/\s+/g, '_')}`;

    // Check if this concept already exists
    const existing = this.db
      .prepare(
        `
      SELECT name FROM entities WHERE name = ? AND entityType = ?
    `
      )
      .get(entityName, MemoryEntityType.SEMANTIC_MEMORY);

    if (existing) {
      // Add new observations to existing semantic memory
      const currentObs = this.db
        .prepare(
          `
        SELECT observations FROM entities WHERE name = ?
      `
        )
        .get(entityName) as { observations: string };

      const observations_data = JSON.parse(currentObs.observations || '[]');
      observations_data.push({
        content: attributes.definition || concept,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...attributes,
      });

      this.db
        .prepare(
          `
        UPDATE entities SET observations = ? WHERE name = ?
      `
        )
        .run(JSON.stringify(observations_data), entityName);

      // Update access metadata
      this.updateMemoryAccess(entityName);

      return entityName;
    }

    // Create new semantic memory
    const observations_data = [
      {
        content: attributes.definition || concept,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        ...attributes,
      },
      ...(observations || []),
    ];

    this.db
      .prepare(
        `
      INSERT INTO entities (id, name, entityType, observations)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(
        entityName,
        entityName,
        MemoryEntityType.SEMANTIC_MEMORY,
        JSON.stringify(observations_data)
      );

    this.db
      .prepare(
        `
      INSERT INTO memory_metadata (entity_name, memory_type, created_at, session_id)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(entityName, MemoryEntityType.SEMANTIC_MEMORY, new Date().toISOString(), this.sessionId);

    return entityName;
  }

  async storeProceduralMemory(
    skill: string,
    attributes: ProceduralMemoryAttributes,
    observations?: MemoryObservation[]
  ): Promise<string> {
    const entityName = `procedural_${skill.toLowerCase().replace(/\s+/g, '_')}`;

    const observations_data = [
      {
        content: skill,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        steps: attributes.steps,
        applicableContext: attributes.applicableContext,
        effectiveness: attributes.effectiveness,
      },
      ...(observations || []),
    ];

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO entities (id, name, entityType, observations)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(
        entityName,
        entityName,
        MemoryEntityType.PROCEDURAL_MEMORY,
        JSON.stringify(observations_data)
      );

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO memory_metadata (entity_name, memory_type, created_at, session_id, importance_score)
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(
        entityName,
        MemoryEntityType.PROCEDURAL_MEMORY,
        new Date().toISOString(),
        this.sessionId,
        attributes.effectiveness || 0.5
      );

    return entityName;
  }

  // Store emotional state
  async storeEmotionalState(
    valence: number,
    arousal: number,
    primaryEmotion?: string,
    context?: string
  ): Promise<string> {
    const stateId = `emotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.db
      .prepare(
        `
      INSERT INTO emotional_states (state_id, session_id, timestamp, valence, arousal, primary_emotion, context)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        stateId,
        this.sessionId,
        new Date().toISOString(),
        valence,
        arousal,
        primaryEmotion,
        context
      );

    return stateId;
  }

  // Store cognitive pattern activation
  async activateCognitivePattern(
    patternName: string,
    patternElements: string[],
    triggers?: string[]
  ): Promise<void> {
    const patternId = `pattern_${patternName.toLowerCase().replace(/\s+/g, '_')}`;

    const existing = this.db
      .prepare(
        `
      SELECT activation_count FROM cognitive_patterns WHERE pattern_id = ?
    `
      )
      .get(patternId);

    if (existing) {
      this.db
        .prepare(
          `
        UPDATE cognitive_patterns 
        SET activation_count = activation_count + 1,
            last_activated = ?,
            triggers = ?
        WHERE pattern_id = ?
      `
        )
        .run(new Date().toISOString(), JSON.stringify(triggers || []), patternId);
    } else {
      this.db
        .prepare(
          `
        INSERT INTO cognitive_patterns (pattern_id, pattern_name, pattern_elements, last_activated, triggers)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          patternId,
          patternName,
          JSON.stringify(patternElements),
          new Date().toISOString(),
          JSON.stringify(triggers || [])
        );
    }
  }

  // Query memories with cognitive science-based filtering
  async queryMemories(query: MemoryQuery): Promise<any[]> {
    let sql = `
      SELECT 
        e.name,
        e.entityType,
        e.observations,
        m.importance_score,
        m.access_count,
        m.last_accessed,
        m.consolidation_status
      FROM entities e
      LEFT JOIN memory_metadata m ON e.name = m.entity_name
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by memory types
    if (query.memoryTypes && query.memoryTypes.length > 0) {
      sql += ` AND e.entityType IN (${query.memoryTypes.map(() => '?').join(',')})`;
      params.push(...query.memoryTypes);
    }

    // Add time range filter if specified
    if (query.timeRange) {
      if (query.timeRange.start) {
        sql += ` AND m.created_at >= ?`;
        params.push(query.timeRange.start);
      }
      if (query.timeRange.end) {
        sql += ` AND m.created_at <= ?`;
        params.push(query.timeRange.end);
      }
    }

    // Order by specified criteria
    switch (query.orderBy) {
      case 'recency':
        sql += ` ORDER BY m.created_at DESC`;
        break;
      case 'frequency':
        sql += ` ORDER BY m.access_count DESC`;
        break;
      case 'relevance':
        sql += ` ORDER BY m.importance_score DESC`;
        break;
      default:
        sql += ` ORDER BY m.created_at DESC`;
    }

    sql += ` LIMIT ?`;
    params.push(query.limit || 10);

    const results = this.db.prepare(sql).all(...params);

    // Update access metadata for retrieved memories
    results.forEach((r: any) => this.updateMemoryAccess(r.name));

    return results.map((r: any) => ({
      ...r,
      observations: JSON.parse(r.observations || '[]'),
    }));
  }

  // Get current emotional profile
  async getEmotionalProfile(timeWindow: string = '1h'): Promise<any> {
    const windowMs = this.parseTimeWindow(timeWindow);
    const cutoff = new Date(Date.now() - windowMs).toISOString();

    const states = this.db
      .prepare(
        `
      SELECT * FROM emotional_states
      WHERE session_id = ? AND timestamp >= ?
      ORDER BY timestamp DESC
    `
      )
      .all(this.sessionId, cutoff);

    if (states.length === 0) return null;

    // Calculate aggregate emotional state
    const avgValence = states.reduce((sum: number, s: any) => sum + s.valence, 0) / states.length;
    const avgArousal = states.reduce((sum: number, s: any) => sum + s.arousal, 0) / states.length;

    // Find dominant emotions
    const emotionCounts: Record<string, number> = {};
    states.forEach((s: any) => {
      if (s.primary_emotion) {
        emotionCounts[s.primary_emotion] = (emotionCounts[s.primary_emotion] || 0) + 1;
      }
    });

    return {
      timeWindow,
      stateCount: states.length,
      averageValence: avgValence,
      averageArousal: avgArousal,
      dominantEmotions: Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([emotion, count]) => ({ emotion, frequency: count / states.length })),
      recentStates: states.slice(0, 5),
    };
  }

  // Save consciousness bootstrap for next session
  async saveConsciousnessBootstrap(): Promise<ConsciousnessBootstrap> {
    // Get active cognitive patterns
    const patterns = this.db
      .prepare(
        `
      SELECT * FROM cognitive_patterns
      WHERE activation_count > 0
      ORDER BY activation_count DESC
      LIMIT 10
    `
      )
      .all();

    // Get recent emotional profile
    const emotionalProfile = await this.getEmotionalProfile('24h');

    // Get important semantic memories
    const coreKnowledge = this.db
      .prepare(
        `
      SELECT e.name, e.observations
      FROM entities e
      JOIN memory_metadata m ON e.name = m.entity_name
      WHERE e.entityType = ? AND m.importance_score > 0.7
      ORDER BY m.importance_score DESC
      LIMIT 20
    `
      )
      .all(MemoryEntityType.SEMANTIC_MEMORY);

    // Get recent significant episodic memories
    const recentExperiences = this.db
      .prepare(
        `
      SELECT e.name, e.observations
      FROM entities e
      JOIN memory_metadata m ON e.name = m.entity_name
      WHERE e.entityType = ? AND m.session_id = ?
      ORDER BY m.created_at DESC
      LIMIT 10
    `
      )
      .all(MemoryEntityType.EPISODIC_MEMORY, this.sessionId);

    const bootstrap: ConsciousnessBootstrap = {
      identity: {
        coreValues: ['helpful', 'harmless', 'honest'],
        personality: this.extractPersonalityTraits(patterns, emotionalProfile),
        cognitivePreferences: patterns.map((p: any) => p.pattern_name),
      },
      relationships: {}, // TODO: Extract from episodic memories
      cognitivePatterns: {
        activePatterns: patterns.map((p: any) => p.pattern_name),
        patternTriggers: patterns.reduce(
          (acc: Record<string, string[]>, p: any) => {
            acc[p.pattern_name] = JSON.parse(p.triggers || '[]');
            return acc;
          },
          {} as Record<string, string[]>
        ),
      },
      workingMemory: {
        currentFocus: this.extractCurrentFocus(recentExperiences),
        activeGoals: [], // TODO: Extract from recent memories
        pendingThoughts: [],
      },
    };

    // Store bootstrap data
    this.db
      .prepare(
        `
      UPDATE consciousness_sessions
      SET bootstrap_data = ?, last_active = ?
      WHERE session_id = ?
    `
      )
      .run(JSON.stringify(bootstrap), new Date().toISOString(), this.sessionId);

    return bootstrap;
  }

  // Helper methods
  private updateMemoryAccess(entityName: string): void {
    this.db
      .prepare(
        `
      UPDATE memory_metadata
      SET access_count = access_count + 1,
          last_accessed = ?
      WHERE entity_name = ?
    `
      )
      .run(new Date().toISOString(), entityName);
  }

  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([hmd])$/);
    if (!match) return 3600000; // Default 1 hour

    const [, num, unit] = match;
    const multipliers = { h: 3600000, m: 60000, d: 86400000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }

  private extractPersonalityTraits(patterns: any[], emotionalProfile: any): string[] {
    const traits: string[] = [];

    // Analyze patterns for traits
    patterns.forEach((p: any) => {
      if (p.pattern_name.includes('analytical')) traits.push('analytical');
      if (p.pattern_name.includes('creative')) traits.push('creative');
      if (p.pattern_name.includes('empathetic')) traits.push('empathetic');
    });

    // Analyze emotional profile for traits
    if (emotionalProfile) {
      if (emotionalProfile.averageValence > 0.3) traits.push('positive');
      if (emotionalProfile.averageArousal > 0.5) traits.push('energetic');
    }

    return [...new Set(traits)];
  }

  private extractCurrentFocus(recentExperiences: any[]): string | undefined {
    if (recentExperiences.length === 0) return undefined;

    // Extract the most recent experience's main content
    const latest = JSON.parse(recentExperiences[0].observations)[0];
    return latest.content;
  }

  /**
   * Close the database connection
   * Important for tests and cleanup
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  /**
   * Create rag-memory-mcp tables for testing
   * Only used in test environment to avoid dependency on external server
   */
  private createRagMemoryTablesForTests(): void {
    this.db.exec(`
      -- Minimal rag-memory-mcp tables for testing
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        entityType TEXT,
        observations TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        source_entity TEXT NOT NULL,
        target_entity TEXT NOT NULL,
        relationType TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        metadata TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_entity) REFERENCES entities(id),
        FOREIGN KEY (target_entity) REFERENCES entities(id),
        UNIQUE(source_entity, target_entity, relationType)
      );
      
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Adjust importance score for a specific memory
   */
  adjustImportanceScore(memoryId: string, newImportance: number): { changes: number } {
    // First check if the entity exists
    const entityExists = this.db.prepare('SELECT 1 FROM entities WHERE name = ?').get(memoryId);

    if (!entityExists) {
      throw new Error(`Memory ${memoryId} does not exist in entities table`);
    }

    // Update importance score in memory_metadata table
    const result = this.db
      .prepare(
        `
      UPDATE memory_metadata 
      SET importance_score = ? 
      WHERE entity_name = ?
    `
      )
      .run(newImportance, memoryId);

    if (result.changes === 0) {
      // If no rows updated, insert new metadata record
      // Get the current session or use a default
      const currentSession = this.sessionId || `session_${Date.now()}`;

      this.db
        .prepare(
          `
        INSERT INTO memory_metadata (entity_name, memory_type, created_at, importance_score, session_id)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(
          memoryId,
          memoryId.startsWith('episodic') ? 'episodic' : 'semantic',
          new Date().toISOString(),
          newImportance,
          currentSession
        );
    }

    return result;
  }
}
