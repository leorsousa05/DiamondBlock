---
created_at: 2026-07-08
updated_at: 2026-07-08
---

# Proposal: Separate Codebase Index from Memory Storage

## Why

Today the codebase indexer stores every code chunk as a `Memory` entity in the vault. This causes two problems:

1. `dblock memory list` is polluted with thousands of auto-generated code chunks, making it hard for users to find real memories.
2. The memory domain (user-captured knowledge) and the codebase index (derived search index) are mixed in the same storage, schema, and mental model.

We need a dedicated storage and command surface for codebase chunks while keeping semantic search working.

## Scope

### In scope

- New `CodebaseChunkRepository` port and a file-based implementation.
- Store chunks under `vault/CodebaseChunks/<projectId>/<chunkId>.json`, separate from `vault/Memory/`.
- Change `CodebaseIndexManifest` to reference `chunkIds` instead of `memoryIds`.
- Update `CodebaseIndexer` to persist chunks via the new repository and index embeddings by chunk id.
- Generalize `VectorIndex` to accept a `VectorIndexable` abstraction so both memories and code chunks can share the same vector store without leaking memory semantics.
- Add `dblock index list` to list chunks for a project.
- Add `dblock index search <query>` to run semantic search over chunks.
- Update `dblock index --purge`, `dblock index --clean-orphans`, and the orphaned-chunk cleaner to operate on the new repository.
- Automatic migration of legacy manifests that still reference `memoryIds`.

### Out of scope

- Knowledge graph, symbol relations, or AST enhancements (covered by spec 007 and future milestones).
- New language parsers.
- Changing the embedding model or vector store backend.
- Web UI or MCP tools for the index.

## Constraints

- Local-first: keep everything inside the vault directory.
- Backward compatible: existing vaults must migrate automatically without manual steps.
- No external APIs.
- Keep the vector store shared between memories and code chunks to avoid duplicating the sqlite-vec database.

## Success Criteria

- `dblock memory list` no longer shows code chunks after a fresh index.
- `dblock index list` shows only code chunks for the current project.
- `dblock index search` returns relevant chunks ranked by semantic similarity.
- `--purge` and `--clean-orphans` remove chunk files and vector entries but leave user memories untouched.
- Legacy manifests with `memoryIds` trigger a full reindex and cleanup of old code memories.
- All modified components have unit tests; `npm run typecheck` and `npm test` pass.
