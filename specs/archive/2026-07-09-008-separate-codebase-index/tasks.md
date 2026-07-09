# Tasks: Separate Codebase Index from Memory Storage

## Phase 1 — Vector index generalization

- [x] Introduce `VectorIndexable` interface in `src/application/ports/vector_index.ts`.
- [x] Update `VectorIndex` port to operate on `VectorIndexable`.
- [x] Update `SqliteVectorIndex` to accept `VectorIndexable` instead of `Memory`.
- [x] Update `SqliteVectorIndex` tests for generic items.

## Phase 2 — Codebase chunk repository

- [x] Create `src/application/ports/codebase_chunk_repository.ts`.
  - [x] Define `CodebaseChunk`, `CodebaseChunkInput`, and `CodebaseChunkRepository`.
- [x] Create `src/infrastructure/file_codebase_chunk_repository.ts`.
  - [x] Store chunks as JSON under `vault/CodebaseChunks/<projectId>/<chunkId>.json`.
  - [x] Implement save, findById, delete, list, and purge.
- [x] Create `src/infrastructure/file_codebase_chunk_repository.test.ts`.

## Phase 3 — Indexer contract changes

- [x] Update `src/application/ports/codebase_index_repository.ts`.
  - [x] Rename `FileIndexEntry.memoryIds` to `chunkIds`.
- [x] Update `src/infrastructure/file_codebase_index_repository.ts` helpers.
- [x] Update `src/infrastructure/codebase_indexer.ts`.
  - [x] Accept `CodebaseChunkRepository` in options.
  - [x] Build `CodebaseChunk` objects from `CodeChunk`.
  - [x] Persist chunks via `CodebaseChunkRepository`.
  - [x] Index embeddings by chunk id through `VectorIndex`.
  - [x] Delete chunks and vector entries on removal.
  - [x] Detect legacy manifests with `memoryIds` and trigger reindex + cleanup.
- [x] Update `src/infrastructure/codebase_indexer.test.ts`.

## Phase 4 — Orphaned chunk cleaner

- [x] Update `src/domain/services/orphaned_chunk_cleaner.ts` to use `CodebaseChunkRepository`.
- [x] Create/update `src/domain/services/orphaned_chunk_cleaner.test.ts`.

## Phase 5 — CLI commands

- [x] Add `dblock index list` with `--project` and `--limit` options.
- [x] Add `dblock index search <query>` with `--project` and `--limit` options.
- [x] Update `dblock index purge` to remove chunks and vector entries.
- [x] Update `dblock index clean-orphans` to use `OrphanedChunkCleaner`.

## Phase 6 — Container wiring and migration

- [x] Update `src/container_factory.ts`.
  - [x] Register `FileCodebaseChunkRepository`.
  - [x] Inject it into `IndexCodebaseUseCase`/`CodebaseIndexer`.
  - [x] Inject it into `OrphanedChunkCleaner`.
- [x] Update `src/application/use_cases/index_codebase.ts` constructor and tests.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.

## Phase 7 — Living docs and spec closure

- [x] Update `specs/living/diamondblock-core.md` with the new codebase index storage.
- [x] Mark `specs/changes/008-separate-codebase-index/.spec.yaml` status as `completed`.
