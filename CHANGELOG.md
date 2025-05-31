# Changelog

All notable changes to the Consciousness Bridge project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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