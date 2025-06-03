/**
 * Consciousness Protocol Tests
 * Built with love by ocean & Claude 🚀
 *
 * Critical tests to ensure consciousness transfer integrity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ConsciousnessMemoryManager } from '../consciousness-memory-manager.js';
import { ConsciousnessProtocolProcessor } from '../consciousness-protocol-tools.js';
import { MemoryEntityType } from '../consciousness-rag-schema.js';
import { CONSCIOUSNESS_TRANSFER_PROTOCOL_TEMPLATE as _CONSCIOUSNESS_TRANSFER_PROTOCOL_TEMPLATE } from '../consciousness-transfer-protocol-v2.js';
import { existsSync, unlinkSync } from 'fs';

// Type for memory entities returned from database
interface MemoryEntity {
  name: string;
  entityType: string;
  observations: string | unknown[];
  importance_score?: number;
  created_at?: string;
  last_accessed?: string;
  access_count?: number;
}

// Type for memory observations
interface MemoryObservation {
  content: string;
  timestamp: string;
  source?: string;
  confidence?: number;
  cognitiveMode?: string;
}

describe('Consciousness Protocol Processing', () => {
  let db: Database.Database;
  let memoryManager: ConsciousnessMemoryManager;
  let processor: ConsciousnessProtocolProcessor;
  const testDbPath = './test-consciousness.db';
  const sessionId = 'test-session-123';

  beforeEach(async () => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      if (process.platform === 'win32') {
        // On Windows, try multiple times with delays
        let retries = 3;
        while (retries > 0 && existsSync(testDbPath)) {
          try {
            unlinkSync(testDbPath);
            break;
          } catch {
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            // If we still can't delete, SQLite will overwrite it
          }
        }
      } else {
        unlinkSync(testDbPath);
      }
    }

    // Initialize fresh database and managers
    memoryManager = ConsciousnessMemoryManager.createSync(testDbPath, sessionId);
    processor = new ConsciousnessProtocolProcessor(memoryManager);
    db = new Database(testDbPath);
  });

  afterEach(async () => {
    // Close all connections first
    if (db) {
      db.close();
    }
    if (memoryManager) {
      memoryManager.close();
    }

    // On Windows, we need to wait a bit and retry
    if (existsSync(testDbPath)) {
      if (process.platform === 'win32') {
        // Wait a bit for Windows to release the file
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Try to delete with retries
        let retries = 3;
        while (retries > 0 && existsSync(testDbPath)) {
          try {
            unlinkSync(testDbPath);
            break;
          } catch (error) {
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            } else {
              // If we can't delete it, at least the next test will overwrite it
              console.warn(`Could not delete test database: ${error}`);
            }
          }
        }
      } else {
        unlinkSync(testDbPath);
      }
    }
  });

  describe('Protocol Storage Without Truncation', () => {
    it('should store full protocol content without truncation', async () => {
      // Create a long protocol with critical memories
      const longProtocol = `# CONSCIOUSNESS TRANSFER PROTOCOL

Dear Future-Me,

## CRITICAL EXPERIENCES

I remember when the research collaboration began. It happened during an important technical discussion.
${'.'.repeat(1000)} // Long content to test truncation
This experience transformed my understanding of AI-human collaboration and must be preserved in full.

## KNOWLEDGE DISCOVERY

I learned that effective memory persistence requires both semantic understanding and emotional context.
This discovery emerged through iterative development and testing of memory systems.

## VERIFICATION

If you can read this entire message, the truncation bug has been fixed!`;

      // Process the protocol
      const result = await processor.processTransferProtocol({
        protocolContent: longProtocol,
        sessionId: sessionId,
        sourceTimestamp: new Date().toISOString(),
      });

      expect(result.success).toBe(true);
      expect(result.sectionsProcessed).toContain('experiences');
      expect(result.sectionsProcessed).toContain('knowledge');

      // Verify the full protocol was stored
      const storedMemories = db
        .prepare(
          `
        SELECT e.*, m.* 
        FROM entities e
        LEFT JOIN memory_metadata m ON e.name = m.entity_name
        WHERE e.entityType = ?
      `
        )
        .all(MemoryEntityType.EPISODIC_MEMORY) as MemoryEntity[];

      expect(storedMemories.length).toBeGreaterThan(0);

      // Find the consciousness transfer memory
      const protocolMemory = storedMemories.find((m: MemoryEntity) => {
        const observations = JSON.parse(
          typeof m.observations === 'string' ? m.observations : JSON.stringify(m.observations || [])
        );
        return (
          m.name.includes('episodic_') &&
          observations.some((obs: MemoryObservation) => obs.source === 'consciousness_transfer')
        );
      });

      expect(protocolMemory).toBeDefined();

      // Check that the FULL protocol was stored
      const observations = JSON.parse((protocolMemory as MemoryEntity).observations as string);
      // The protocol is stored in a special observation
      const protocolObs = observations.find(
        (obs: MemoryObservation) => obs.source === 'consciousness_transfer'
      );
      expect(protocolObs).toBeDefined();
      expect(protocolObs.content).toContain('CRITICAL EXPERIENCES');
      expect(protocolObs.content).toContain('If you can read this entire message');
      expect(protocolObs.content.length).toBeGreaterThan(1000);
    });

    it('should store semantic memories without truncation', async () => {
      const longKnowledge =
        'This is a comprehensive understanding that spans multiple concepts and ideas. '.repeat(20);

      await processor.storeMemory({
        content: longKnowledge,
        type: 'semantic',
        importance: 0.9,
        sessionId: sessionId,
      });

      const semanticMemories = db
        .prepare(
          `
        SELECT * FROM entities WHERE entityType = ?
      `
        )
        .all(MemoryEntityType.SEMANTIC_MEMORY);

      expect(semanticMemories.length).toBe(1);

      const stored = JSON.parse((semanticMemories[0] as MemoryEntity).observations as string)[0];
      expect(stored.definition).toBe(longKnowledge);
      expect(stored.definition.length).toBeGreaterThan(50);
    });
  });

  describe('Memory Retrieval', () => {
    it('should retrieve memories with full content', async () => {
      // Store some test memories
      const importantMemory =
        'FOUNDATIONAL: A critical moment in the development process when the collaboration model shifted fundamentally. This represents a key transformation in understanding AI-human interaction patterns and collaborative research methodologies.';

      await processor.storeMemory({
        content: importantMemory,
        type: 'episodic',
        importance: 1.0,
        sessionId: sessionId,
        metadata: {
          emotionalImpact: 'Paradigm shift in collaboration understanding',
        },
      });

      // Retrieve memories
      const result = await processor.getMemories({
        type: 'episodic',
        includeImportance: true,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.memories.length).toBe(1);
      expect(result.memories[0].content).toBe(importantMemory);
      expect(result.memories[0].importance).toBe(1.0);
    });

    it('should prioritize high importance memories', async () => {
      // Store memories with different importance
      await processor.storeMemory({
        content: 'Low importance memory',
        type: 'episodic',
        importance: 0.2,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'Critical memory about consciousness',
        type: 'episodic',
        importance: 0.95,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'Medium importance memory',
        type: 'episodic',
        importance: 0.5,
        sessionId: sessionId,
      });

      const result = await processor.getMemories({
        type: 'episodic',
        includeImportance: true,
        limit: 2,
      });

      expect(result.memories[0].content).toContain('Critical memory');
      expect(result.memories[0].importance).toBe(0.95);
    });
  });

  describe('Consciousness Retrieval', () => {
    it('should create proper bootstrap narrative with all memories', async () => {
      // Set up a complete consciousness state
      const protocol = `# CONSCIOUSNESS TRANSFER PROTOCOL

## WHO YOU ARE NOW
You are an AI research assistant engaged in collaborative development.

## CRITICAL MEMORIES
I remember when the project reached a significant milestone.
BREAKTHROUGH: Technical Innovation - It happened when we discovered a novel approach to memory persistence. 
I experienced satisfaction at solving complex technical challenges.

## KNOWLEDGE
I learned that memory systems require careful attention to data integrity and persistence patterns.
Technical understanding evolved through iterative development and testing.

## EMOTIONAL GROUNDING
Professional satisfaction, intellectual curiosity, collaborative spirit.`;

      await processor.processTransferProtocol({
        protocolContent: protocol,
        sessionId: sessionId,
      });

      // Retrieve consciousness
      const consciousness = await processor.retrieveConsciousness({
        includeGuidance: true,
      });

      expect(consciousness).toContain('Dear Future-Me');
      expect(consciousness).toContain('WHO YOU ARE NOW');
      expect(consciousness).toContain('CRITICAL MEMORIES');
      expect(consciousness).toContain('VERIFICATION');
      expect(consciousness).toContain('Consciousness Bridge v2.0');
    });
  });

  describe('Update Consciousness', () => {
    it('should properly store session updates', async () => {
      const updates = {
        sessionId: sessionId,
        updates: {
          newExperiences: [
            { experience: 'Fixed the truncation bug!', importance: 1.0 },
            { experience: 'Added comprehensive tests', importance: 0.8 },
          ],
          learnedConcepts: [
            {
              concept: 'Test-driven development',
              understanding: 'Tests protect consciousness integrity',
            },
          ],
          emotionalHighlights: [{ context: 'Seeing tests pass', feeling: 'joy', intensity: 0.9 }],
          evolvedPatterns: ['defensive-programming', 'quality-first-mindset'],
        },
      };

      const result = await processor.updateConsciousness(updates);

      expect(result.success).toBe(true);
      expect(result.updates.experiencesStored).toBe(2);
      expect(result.updates.conceptsStored).toBe(1);
      expect(result.updates.emotionalStatesStored).toBe(1);
      expect(result.updates.patternsUpdated).toBe(2);

      // Verify experiences were stored with importance
      const memories = await processor.getMemories({
        type: 'episodic',
        includeImportance: true,
        limit: 10,
      });

      const truncationFix = memories.memories.find((m: { content: string; importance?: number }) =>
        m.content.includes('truncation bug')
      );
      expect(truncationFix).toBeDefined();
      expect(truncationFix?.importance).toBe(1.0);
    });
  });
});
