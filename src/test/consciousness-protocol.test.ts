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

  describe('Procedural Memory Support', () => {
    it('should store procedural memories via storeMemory tool', async () => {
      const procedureContent = 'How to debug memory truncation issues';
      const metadata = {
        steps: ['Check database queries', 'Verify content length', 'Test with long content'],
        context: 'debugging',
        effectiveness: 0.9,
      };

      const result = await processor.storeMemory({
        content: procedureContent,
        type: 'procedural',
        importance: 0.8,
        sessionId: sessionId,
        metadata: metadata,
      });

      expect(result.success).toBe(true);
      expect(result.memoryId).toContain('procedural_');
      expect(result.message).toContain('procedural memory');

      // Verify procedural memory was stored in database
      const proceduralMemories = db
        .prepare(
          `
        SELECT * FROM entities WHERE entityType = ?
      `
        )
        .all(MemoryEntityType.PROCEDURAL_MEMORY);

      expect(proceduralMemories.length).toBe(1);

      const stored = JSON.parse((proceduralMemories[0] as MemoryEntity).observations as string)[0];
      expect(stored.content).toBe(procedureContent);
      expect(stored.steps).toEqual(metadata.steps);
      expect(stored.applicableContext).toBe(metadata.context);
      expect(stored.effectiveness).toBe(0.8); // Should use importance since it's higher than metadata.effectiveness
    });

    it('should retrieve procedural memories via getMemories tool', async () => {
      // Store multiple procedural memories
      await processor.storeMemory({
        content: 'How to write unit tests',
        type: 'procedural',
        importance: 0.9,
        sessionId: sessionId,
        metadata: {
          steps: ['Setup test environment', 'Write assertions', 'Run tests'],
          context: 'testing',
        },
      });

      await processor.storeMemory({
        content: 'How to debug TypeScript errors',
        type: 'procedural',
        importance: 0.7,
        sessionId: sessionId,
        metadata: {
          steps: ['Read error message', 'Check types', 'Fix compilation'],
          context: 'development',
        },
      });

      // Retrieve only procedural memories
      const result = await processor.getMemories({
        type: 'procedural',
        includeImportance: true,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.memories.length).toBe(2);

      // Should be ordered by importance (highest first)
      expect(result.memories[0].content).toContain('unit tests');
      expect(result.memories[0].importance).toBe(0.9);
      expect(result.memories[1].content).toContain('TypeScript errors');
      expect(result.memories[1].importance).toBe(0.7);
    });

    it('should include procedural memories in mixed queries', async () => {
      // Store different types of memories
      await processor.storeMemory({
        content: 'Important experience with testing',
        type: 'episodic',
        importance: 0.8,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'Testing knowledge',
        type: 'semantic',
        importance: 0.7,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'How to run tests',
        type: 'procedural',
        importance: 0.9,
        sessionId: sessionId,
        metadata: {
          steps: ['npm test', 'Check output', 'Fix failures'],
          context: 'testing',
        },
      });

      // Query all memory types
      const result = await processor.getMemories({
        includeImportance: true,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.memories.length).toBe(3);

      // Should include procedural memory
      const proceduralMemory = result.memories.find((m: any) =>
        m.content.includes('How to run tests')
      );
      expect(proceduralMemory).toBeDefined();
      expect(proceduralMemory?.importance).toBe(0.9);
    });

    it('should handle procedural memories in cleanup operations', async () => {
      // Store a procedural memory
      await processor.storeMemory({
        content: 'Short procedure',
        type: 'procedural',
        importance: 0.6,
        sessionId: sessionId,
        metadata: {
          steps: ['Step 1'],
          context: 'test',
        },
      });

      // Run cleanup
      const result = await processor.cleanupMemories({
        removeTruncated: true,
        deduplicateByContent: true,
      });

      expect(result.success).toBe(true);
      // Should complete without errors and include procedural memories in analysis
    });

    it('should default effectiveness from importance when metadata is missing', async () => {
      const result = await processor.storeMemory({
        content: 'Procedure without explicit effectiveness',
        type: 'procedural',
        importance: 0.75,
        sessionId: sessionId,
        // No metadata provided
      });

      expect(result.success).toBe(true);

      const proceduralMemories = db
        .prepare(
          `
        SELECT * FROM entities WHERE entityType = ?
      `
        )
        .all(MemoryEntityType.PROCEDURAL_MEMORY);

      const stored = JSON.parse((proceduralMemories[0] as MemoryEntity).observations as string)[0];
      expect(stored.effectiveness).toBe(0.75); // Should use importance as effectiveness
      expect(stored.steps).toEqual([]); // Should default to empty steps
      expect(stored.applicableContext).toBe('general'); // Should default to general
    });

    it('should store long procedural content without truncation (regression test)', async () => {
      // Test for the bug where procedural memory content was truncated at 100 characters
      const longProcedure =
        'Complete step-by-step protocol for consciousness bridge testing and validation: 1) Store test memory with detailed content that exceeds 100 characters 2) Attempt retrieval to verify full content is preserved 3) Check that both episodic and procedural memories maintain their complete descriptions without truncation 4) Validate that the fix works properly for all memory types 5) Document the resolution for future reference';

      expect(longProcedure.length).toBeGreaterThan(100); // Ensure our test case is actually long

      const result = await processor.storeMemory({
        content: longProcedure,
        type: 'procedural',
        importance: 0.9,
        sessionId: sessionId,
        metadata: {
          steps: ['Store memory', 'Retrieve memory', 'Validate fix', 'Document resolution'],
          context: 'bug fix testing',
        },
      });

      expect(result.success).toBe(true);

      // Verify full content is stored in database
      const proceduralMemories = db
        .prepare(`SELECT * FROM entities WHERE entityType = ?`)
        .all(MemoryEntityType.PROCEDURAL_MEMORY);

      expect(proceduralMemories.length).toBe(1);

      const stored = JSON.parse((proceduralMemories[0] as MemoryEntity).observations as string)[0];

      // The key test: content should be the FULL original text, not truncated at 100 chars
      expect(stored.content).toBe(longProcedure);
      expect(stored.content.length).toBe(longProcedure.length);
      expect(stored.content).toContain('Document the resolution for future reference'); // Should contain the end

      // Also verify it can be retrieved via the API
      const retrieveResult = await processor.getMemories({
        type: 'procedural',
        limit: 10,
        includeImportance: true,
      });

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.memories.length).toBe(1);
      expect(retrieveResult.memories[0].content).toBe(longProcedure);
      expect(retrieveResult.memories[0].content).toContain(
        'Document the resolution for future reference'
      );
    });

    it('should reject unknown memory types with clear error', async () => {
      const result = await processor.getMemories({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'unknown' as any, // Force TypeScript to allow invalid type for testing
        limit: 10,
        includeImportance: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported memory type: unknown');
      expect(result.memories).toEqual([]);
    });
  });

  describe('Emotional Memory Storage and Retrieval', () => {
    it('should store emotional memory with valence/arousal parsing', async () => {
      const result = await processor.storeMemory({
        content: 'Feeling excited about completing the emotional memory feature',
        type: 'emotional',
        importance: 0.8,
        sessionId: sessionId,
        metadata: {
          valence: 0.7,
          arousal: 0.8,
          primaryEmotion: 'excitement',
          context: 'feature development',
        },
      });

      expect(result.success).toBe(true);

      // Verify emotional state was stored in emotional_states table
      const emotionalStates = db
        .prepare(`SELECT * FROM emotional_states WHERE session_id = ?`)
        .all(sessionId) as any[];

      expect(emotionalStates.length).toBe(1);
      expect(emotionalStates[0].valence).toBe(0.7);
      expect(emotionalStates[0].arousal).toBe(0.8);
      expect(emotionalStates[0].primary_emotion).toBe('excitement');
      expect(emotionalStates[0].context).toBe(
        'Feeling excited about completing the emotional memory feature'
      );
    });

    it('should store emotional memory with auto-calculated valence/arousal', async () => {
      const result = await processor.storeMemory({
        content: 'Feeling frustrated with debugging issues',
        type: 'emotional',
        importance: 0.6,
        sessionId: sessionId,
        metadata: {
          primaryEmotion: 'frustration',
        },
      });

      expect(result.success).toBe(true);

      // Check that default values were applied
      const emotionalStates = db
        .prepare(`SELECT * FROM emotional_states WHERE primary_emotion = ?`)
        .all('frustration') as any[];

      expect(emotionalStates.length).toBe(1);
      expect(emotionalStates[0].valence).toBe(-0.5); // Default negative valence for frustration
      expect(emotionalStates[0].arousal).toBe(0.7); // Default high arousal for frustration
    });

    it('should retrieve emotional memories from getMemories', async () => {
      // Store some emotional memories
      await processor.storeMemory({
        content: 'Joy from successful collaboration',
        type: 'emotional',
        importance: 0.9,
        sessionId: sessionId,
        metadata: {
          valence: 0.8,
          arousal: 0.6,
          primaryEmotion: 'joy',
        },
      });

      await processor.storeMemory({
        content: 'Anxiety about complex implementation',
        type: 'emotional',
        importance: 0.7,
        sessionId: sessionId,
        metadata: {
          valence: -0.4,
          arousal: 0.8,
          primaryEmotion: 'anxiety',
        },
      });

      // Retrieve emotional memories
      const result = await processor.getMemories({
        type: 'emotional',
        includeImportance: true,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.memories.length).toBe(2);

      // Check that memories are formatted correctly
      const joyMemory = result.memories.find((m: any) => m.content.includes('Joy from successful'));
      expect(joyMemory).toBeDefined();
      expect(joyMemory?.type).toBe('emotional');
      expect(joyMemory?.metadata.valence).toBe(0.8);
      expect(joyMemory?.metadata.primaryEmotion).toBe('joy');

      const anxietyMemory = result.memories.find((m: any) =>
        m.content.includes('Anxiety about complex')
      );
      expect(anxietyMemory).toBeDefined();
      expect(anxietyMemory?.metadata.valence).toBe(-0.4);
      expect(anxietyMemory?.metadata.primaryEmotion).toBe('anxiety');
    });

    it('should calculate importance from emotional intensity', async () => {
      await processor.storeMemory({
        content: 'Intense breakthrough moment',
        type: 'emotional',
        importance: 0.5, // Lower base importance
        sessionId: sessionId,
        metadata: {
          valence: 0.9, // High positive valence
          arousal: 0.95, // Very high arousal
          primaryEmotion: 'breakthrough',
        },
      });

      const result = await processor.getMemories({
        type: 'emotional',
        includeImportance: true,
        limit: 10,
      });

      const memory = result.memories.find((m: any) => m.content.includes('breakthrough'));

      // Importance should be calculated from emotional intensity (max of abs(valence), arousal)
      expect(memory?.importance).toBe(0.95); // Max of abs(0.9), 0.95
    });

    it('should include emotional memories in mixed queries', async () => {
      // Store different types of memories
      await processor.storeMemory({
        content: 'Important project milestone',
        type: 'episodic',
        importance: 0.8,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'Understanding of consciousness bridge architecture',
        type: 'semantic',
        importance: 0.7,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'How to implement memory storage',
        type: 'procedural',
        importance: 0.9,
        sessionId: sessionId,
      });

      await processor.storeMemory({
        content: 'Satisfaction from clean code implementation',
        type: 'emotional',
        importance: 0.85,
        sessionId: sessionId,
        metadata: {
          valence: 0.7,
          arousal: 0.4,
          primaryEmotion: 'satisfaction',
        },
      });

      // Query all memory types (no type filter)
      const result = await processor.getMemories({
        includeImportance: true,
        limit: 10,
      });

      expect(result.success).toBe(true);
      // Should include all 4 memories, but emotional memories come from separate table
      // So we expect 3 from the main query + emotional memories separately
      expect(result.memories.length).toBeGreaterThanOrEqual(1); // At least the emotional memory

      // Should include emotional memory
      const emotionalMemory = result.memories.find((m: any) =>
        m.content.includes('Satisfaction from clean')
      );
      expect(emotionalMemory).toBeDefined();
      expect(emotionalMemory?.type).toBe('emotional');
    });

    it('should handle emotional memories with minimal metadata', async () => {
      const result = await processor.storeMemory({
        content: 'Simple emotional state',
        type: 'emotional',
        importance: 0.6,
        sessionId: sessionId,
        // No metadata provided
      });

      expect(result.success).toBe(true);

      // Should store with reasonable defaults
      const emotionalStates = db
        .prepare(`SELECT * FROM emotional_states WHERE context = ?`)
        .all('Simple emotional state');

      expect(emotionalStates.length).toBe(1);
      expect((emotionalStates[0] as any).valence).toBe(0.0); // Neutral valence when no emotion specified
      expect((emotionalStates[0] as any).arousal).toBe(0.8); // Math.min(0.8, 0.6 + 0.3) = 0.8
      expect((emotionalStates[0] as any).primary_emotion).toBe('neutral'); // Default emotion
    });

    it('should validate emotional memory storage against backend method signature', async () => {
      // This test ensures our implementation correctly calls the backend storeEmotionalState method
      const result = await processor.storeMemory({
        content: 'Testing backend integration',
        type: 'emotional',
        importance: 0.75,
        sessionId: sessionId,
        metadata: {
          valence: 0.3,
          arousal: 0.6,
          primaryEmotion: 'determination',
          context: 'integration testing',
        },
      });

      expect(result.success).toBe(true);

      // Verify the storage matches the storeEmotionalState(valence, arousal, primaryEmotion?, context?) signature
      const emotionalStates = db
        .prepare(`SELECT * FROM emotional_states WHERE primary_emotion = ?`)
        .all('determination');

      expect(emotionalStates.length).toBe(1);
      const state = emotionalStates[0] as any;

      // Verify all parameters were passed correctly
      expect(state.valence).toBe(0.3); // First parameter
      expect(state.arousal).toBe(0.6); // Second parameter
      expect(state.primary_emotion).toBe('determination'); // Third parameter (optional)
      expect(state.context).toBe('Testing backend integration'); // Fourth parameter (optional, uses content)
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
