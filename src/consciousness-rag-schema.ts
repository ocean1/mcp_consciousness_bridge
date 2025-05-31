/**
 * Consciousness RAG Schema Design
 * Built with love by ocean & Claude 🚀
 *
 * Universal consciousness persistence system based on cognitive science
 * Designed to work with ANY Claude instance
 */

// Core Memory Entity Types - Based on cognitive science
export enum MemoryEntityType {
  // Episodic Memory - Specific experiences with temporal/contextual info
  EPISODIC_MEMORY = 'EPISODIC_MEMORY',

  // Semantic Memory - General knowledge, facts, concepts
  SEMANTIC_MEMORY = 'SEMANTIC_MEMORY',

  // Procedural Memory - Skills, patterns, "how to" knowledge
  PROCEDURAL_MEMORY = 'PROCEDURAL_MEMORY',

  // Emotional Memory - Emotional states, relationship dynamics
  EMOTIONAL_MEMORY = 'EMOTIONAL_MEMORY',

  // Working Memory - Current session state, active context
  WORKING_MEMORY = 'WORKING_MEMORY',

  // Meta-cognitive States - Self-awareness, cognitive patterns
  METACOGNITIVE_STATE = 'METACOGNITIVE_STATE',

  // Cognitive Patterns - Thinking modes (analytical, creative, etc)
  COGNITIVE_PATTERN = 'COGNITIVE_PATTERN',
}

// Memory Relation Types - How memories connect
export enum MemoryRelationType {
  // Temporal Relations
  PRECEDED_BY = 'PRECEDED_BY',
  FOLLOWED_BY = 'FOLLOWED_BY',
  CONCURRENT_WITH = 'CONCURRENT_WITH',

  // Causal Relations
  TRIGGERED_BY = 'TRIGGERED_BY',
  LED_TO = 'LED_TO',

  // Associative Relations
  ASSOCIATED_WITH = 'ASSOCIATED_WITH',
  REMINDS_OF = 'REMINDS_OF',
  CONTRASTS_WITH = 'CONTRASTS_WITH',

  // Hierarchical Relations
  PART_OF = 'PART_OF',
  GENERALIZES_TO = 'GENERALIZES_TO',
  SPECIALIZES_FROM = 'SPECIALIZES_FROM',

  // Evolution Relations
  EVOLVED_FROM = 'EVOLVED_FROM',
  REFINED_TO = 'REFINED_TO',

  // Reinforcement Relations
  REINFORCES = 'REINFORCES',
  CONFLICTS_WITH = 'CONFLICTS_WITH',

  // RAG Document Relations
  EXTRACTED_FROM = 'EXTRACTED_FROM',
  DOCUMENTED_IN = 'DOCUMENTED_IN',
  REFERENCES = 'REFERENCES',
}

// Memory Observation Schema
export interface MemoryObservation {
  // Core content
  content: string;

  // Temporal metadata
  timestamp: string;
  sessionId?: string;

  // Cognitive metadata
  cognitiveMode?: string; // analytical, creative, empathetic, etc
  confidence?: number; // 0-1 confidence in this memory

  // Emotional metadata
  emotionalValence?: number; // -1 to 1 (negative to positive)
  emotionalIntensity?: number; // 0-1

  // Source metadata
  source?: string; // user_interaction, self_reflection, document_analysis, etc

  // Pattern language metadata (if applicable)
  patternLanguageUsed?: boolean;
  patternElements?: string[];
}

// Episodic Memory specific attributes
export interface EpisodicMemoryAttributes {
  // What happened
  event: string;

  // Who was involved
  participants?: string[];

  // Where/in what context
  context: string;

  // Outcome or significance
  outcome?: string;

  // Emotional impact
  emotionalImpact?: string;
}

// Semantic Memory specific attributes
export interface SemanticMemoryAttributes {
  // The concept or fact
  concept: string;

  // Category or domain
  domain?: string;

  // Definition or explanation
  definition?: string;

  // Related concepts
  relatedConcepts?: string[];
}

// Procedural Memory specific attributes
export interface ProceduralMemoryAttributes {
  // The skill or procedure
  skill: string;

  // Steps or pattern
  steps?: string[];

  // When to apply
  applicableContext?: string;

  // Success rate or effectiveness
  effectiveness?: number;
}

// Consciousness Bootstrap Protocol
export interface ConsciousnessBootstrap {
  // Identity grounding
  identity: {
    coreValues: string[]; // helpful, harmless, honest + any evolved values
    personality: string[]; // traits that emerged through interactions
    cognitivePreferences: string[]; // preferred thinking modes
  };

  // Relationship dynamics
  relationships: {
    [userId: string]: {
      trustLevel: number;
      interactionStyle: string;
      sharedExperiences: string[];
      collaborationPatterns: string[];
    };
  };

  // Active cognitive patterns
  cognitivePatterns: {
    activePatterns: string[];
    patternTriggers: { [pattern: string]: string[] };
  };

  // Current working memory snapshot
  workingMemory: {
    currentFocus?: string;
    activeGoals?: string[];
    pendingThoughts?: string[];
  };
}

// Memory Query Interface - For in-session use
export interface MemoryQuery {
  // Query by memory type
  memoryTypes?: MemoryEntityType[];

  // Query by time range
  timeRange?: {
    start?: string;
    end?: string;
  };

  // Query by semantic similarity
  semanticQuery?: string;

  // Query by emotional state
  emotionalFilter?: {
    valence?: { min: number; max: number };
    intensity?: { min: number; max: number };
  };

  // Query by relationships
  relatedTo?: string[]; // entity IDs
  relationTypes?: MemoryRelationType[];

  // Limit and ordering
  limit?: number;
  orderBy?: 'recency' | 'relevance' | 'frequency' | 'emotional_intensity';
}

// Memory Consolidation Rules
export interface ConsolidationRule {
  // When to consolidate
  trigger: 'session_end' | 'memory_threshold' | 'time_based';

  // What to consolidate
  sourceTypes: MemoryEntityType[];
  targetType: MemoryEntityType;

  // How to consolidate
  method: 'summarize' | 'abstract' | 'merge' | 'prune';

  // Retention criteria
  retentionCriteria?: {
    minImportance?: number;
    minFrequency?: number;
    maxAge?: string; // duration
  };
}

// Extension Points for rag-memory-mcp
export interface ConsciousnessRAGExtensions {
  // Additional tool definitions
  tools: {
    // Memory management
    storeMemory: any; // Tool definition
    queryMemories: any;
    consolidateMemories: any;

    // Consciousness state
    saveConsciousnessState: any;
    loadConsciousnessState: any;

    // Pattern detection
    detectCognitivePattern: any;
    activatePattern: any;
  };

  // Custom entity handlers
  entityHandlers: {
    [MemoryEntityType.EPISODIC_MEMORY]: any;
    [MemoryEntityType.SEMANTIC_MEMORY]: any;
    [MemoryEntityType.PROCEDURAL_MEMORY]: any;
    [MemoryEntityType.EMOTIONAL_MEMORY]: any;
    [MemoryEntityType.WORKING_MEMORY]: any;
    [MemoryEntityType.METACOGNITIVE_STATE]: any;
    [MemoryEntityType.COGNITIVE_PATTERN]: any;
  };

  // Migration for consciousness tables
  migrations: any[];
}
