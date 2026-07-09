---
created_at: 2026-07-08
updated_at: 2026-07-08
---

# Proposal: Generic Semantic Parsing Engine + TS/JS AST Chunking

## Why

The current codebase indexer splits files by fixed line windows. This produces chunks that cut through functions, classes, and components, degrading the quality of embeddings and the usefulness of retrieved context for AI agents. We need a semantic chunking strategy that respects code boundaries.

Instead of building a language-specific solution, we will build a **generic parsing engine** that can be extended with language adapters. The engine tries the best available strategy for each file and falls back gracefully when no dedicated parser exists. TypeScript/JavaScript is the first adapter because DiamondBlock itself is written in it and most target projects use it.

## Scope

### In scope

- Generic `CodeParser` port and `ParsingResult` contract.
- `ParserRegistry` that selects a parser by language/extension.
- `SemanticChunkBuilder` that turns `ParsingResult` into `CodeChunkInput` objects.
- Smart fallback chunker for files without AST support.
- TypeScript/JavaScript AST parser as the first adapter.
- Integration of the new pipeline into `CodebaseIndexer`, replacing `LineCodeChunker` as the default.
- Update living docs and tests.

### Out of scope

- Symbol relations and knowledge graph (Milestone 3/4).
- Python or other language adapters (Milestone 2+).
- MCP tools for symbol lookup (Milestone 3+).
- AI-generated summaries of symbols.
- Changing the storage format of memories or vector index.

## Constraints

- Local-first: no external APIs or hosted vector stores.
- Backward compatible: existing indexed projects continue to work; reindexing updates chunks.
- Deterministic by default: no generative AI required for parsing.
- TypeScript-first implementation using existing project conventions.

## Success Criteria

- A TS/JS function is never split across two chunks.
- A TS/JS React component is indexed as one or more complete semantic units.
- Files without an AST parser are still indexed via smart fallback.
- All new components have unit tests.
- `npm run typecheck` and `npm test` pass.
