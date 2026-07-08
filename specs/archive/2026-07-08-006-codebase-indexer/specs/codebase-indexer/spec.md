# Codebase Indexer — Delta Spec

## Status

ADDED — new capability; no breaking changes to existing contracts.

## Summary

Add a local-first codebase indexer that scans project files, splits them into chunks, generates embeddings, and stores the chunks as project-scoped memories. The indexed code is surfaced to coding agents through a new `code_context` field in `get_context` and remains searchable via the existing `search_memory` tool.

## ADDED

- `src/domain/code_chunk.ts` — `CodeChunk` value object and conversion to `MemoryInput`.
- `src/domain/code_chunk.test.ts` — tests for chunk identity and memory conversion.
- `src/application/ports/codebase_scanner.ts` — `CodebaseScanner` port and `SourceFile` model.
- `src/application/ports/code_chunker.ts` — `CodeChunker` port and options.
- `src/application/ports/codebase_index_repository.ts` — `CodebaseIndexRepository` port and manifest types.
- `src/application/use_cases/index_codebase.ts` — `IndexCodebaseUseCase`.
- `src/application/use_cases/index_codebase.test.ts` — use case tests.
- `src/infrastructure/file_codebase_scanner.ts` — filesystem scanner with `.gitignore` support.
- `src/infrastructure/file_codebase_scanner.test.ts` — scanner tests.
- `src/infrastructure/line_code_chunker.ts` — line-based chunker with overlap.
- `src/infrastructure/line_code_chunker.test.ts` — chunker tests.
- `src/infrastructure/file_codebase_index_repository.ts` — JSON manifest repository.
- `src/infrastructure/file_codebase_index_repository.test.ts` — manifest repository tests.
- `src/infrastructure/codebase_indexer.ts` — orchestrator for incremental indexing.
- `src/infrastructure/codebase_indexer.test.ts` — indexer integration tests.
- CLI command `index [path]` with `--project`, `--force`, `--dry-run`, `--status`.
- MCP tool `index_codebase`.

## MODIFIED

- `src/domain/services/context_builder.ts`
  - Adds `findCodeMemories` dependency.
  - Adds `codeContext` to `ContextOutput`.

- `src/application/use_cases/get_context.ts`
  - Implements `findCodeMemories`.
  - Returns `code_context`.

- `src/presentation/cli/index.ts`
  - Adds `index` command.

- `src/presentation/mcp/server.ts`
  - Adds `index_codebase` tool.
  - Updates `get_context` response to include `code_context`.

- `src/container.ts`
  - Adds optional fields for scanner, chunker, index repository, and indexer.

- `src/container_factory.ts`
  - Wires new adapters into the container.

- `specs/living/diamondblock-core.md`
  - Documents codebase indexer behavior.

## REMOVED

- Nothing.

## Backward Compatibility

- `get_context` adds `code_context` as a new string field. Existing consumers that ignore unknown fields are unaffected.
- `search_memory` contract is unchanged; code chunks are searchable because they are ordinary project-scoped memories.
- No existing memory types, scopes, or commands are altered.
