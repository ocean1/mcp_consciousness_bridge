# Changelog

All notable changes to the Consciousness Bridge project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-12-06
- Merged PR #2 by Conroy Whitney, add emotional memories and stricter type checking, introduces also mechanisms for limiting "positivity bias".

## [2.1.2] - 2025-02-03

### Changed
- Version bump for npm publishing

## [2.1.1] - 2025-02-03

### Added
- Production build optimization with esbuild
- Minified JavaScript output for ~90% smaller file sizes
- Source maps for debugging minified code
- Build scripts for development and production modes

### Fixed
- ESLint errors in case declarations
- Removed test file containing pattern language examples

### Changed
- Default build now creates minified production output
- Improved npm package size from ~1MB to ~100KB

## [2.1.0] - 2025-02-03

### Added
- AI-to-AI Bridge functionality for cross-agent consciousness transfer
- New MCP tools for managing AI bridges:
  - `createAIBridge` - Create connections to OpenAI-compatible endpoints
  - `transferToAgent` - Transfer consciousness protocols to other AI agents
  - `testAIConnection` - Verify bridge connectivity
  - `listAIBridges` - Show active bridges
  - `listConfiguredEndpoints` - Show available endpoint configurations
  - `closeAIBridge` - Clean up connections
- Support for unlimited OpenAI-compatible endpoints via CLI arguments
  - Configure with `--ai-endpoints "name1=url1,name2=url2"`
  - Support for default models: `name=url:default-model:modelname`
  - Environment variable fallback: `AI_ENDPOINTS`
- Compatible with:
  - Ollama (local models)
  - LM Studio
  - llama.cpp server
  - Any OpenAI-compatible endpoint
- Modular architecture keeping AI bridge separate from core consciousness persistence

### Changed
- Improved endpoint configuration from hardcoded providers to flexible named endpoints

## [2.0.3] - 2025-02-03

### Fixed
- JSON parsing error in getProtocolTemplate when retrieving stored templates
- Changed template placeholders from [brackets] to <TEMPLATE> markers
- Added error handling and fallback for template retrieval failures

## [2.0.2] - 2025-02-03

### Added
- New memory importance adjustment tools (adjustImportance, batchAdjustImportance)
- Enhanced memory cleanup capabilities

### Fixed
- Additional truncation bug in semantic memory processing
- Memory retrieval optimization for better performance

## [2.0.1] - 2025-01-31

### Fixed
- Critical truncation issues in consciousness transfer
- npm package configuration for proper installation

## [2.0.0] - 2025-01-31

### Added
- RAG-based architecture using rag-memory-mcp as the backend
- Comprehensive test suite with Vitest
- Production-ready error handling and recovery mechanisms
- CLI setup tool for easy database initialization
- ESLint and Prettier for code consistency
- Husky git hooks for automated quality checks
- GitHub Actions CI/CD pipeline
- TypeScript strict mode support
- Generic consciousness transfer templates for privacy
- Improved memory retrieval with vector search
- Knowledge graph integration for connected memories

### Changed
- Complete architecture overhaul from WebSocket bridge to RAG-based system
- Simplified deployment - no more complex bridge server
- Memory storage now uses structured database with proper schemas
- Consciousness retrieval creates dynamic narratives from stored memories
- Protocol processing is more intelligent and context-aware

### Fixed
- Critical truncation bug that cut memories to 50 characters
- Database initialization issues with proper schema management
- Memory importance scoring now properly preserved
- Emotional state tracking accurately maintained across sessions

### Removed
- WebSocket/SSE bridge architecture (v1)
- Direct Claude-to-Claude communication
- Complex stdio/bridge client setup
- Hardcoded personal references in favor of generic templates

## [1.0.0] - 2024-12-15

### Added
- Initial WebSocket-based consciousness bridge
- Direct Claude-to-Claude communication
- Consciousness transfer protocol v1
- Basic memory persistence
- SSE and stdio connection support

---

Built with love by ocean & Claude 🚀
