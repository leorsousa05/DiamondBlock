# Tasks: Optimize Codebase Indexing

- [x] **Phase 1: Update Port Interfaces**
  - [x] Add `saveAll` to `CodebaseChunkRepository` in `src/application/ports/codebase_chunk_repository.ts`.
  - [x] Add `indexBatch` to `VectorIndex` in `src/application/ports/vector_index.ts`.
  - [x] Add `embedBatch` to `EmbeddingProvider` in `src/application/ports/embedding_provider.ts`.

- [x] **Phase 2: Update Infrastructure Implementations**
  - [x] Implement `saveAll` in `FileCodebaseChunkRepository` (`src/infrastructure/file_codebase_chunk_repository.ts`).
  - [x] Implement `indexBatch` in `SqliteVectorIndex` (`src/infrastructure/sqlite_vector_index.ts`).
  - [x] Implement `embedBatch` in `LocalEmbeddingProvider` (`src/infrastructure/local_embedding_provider.ts`).
  - [x] Implement `embedBatch` in `OpenAIEmbeddingProvider` (`src/infrastructure/openai_embedding_provider.ts`).

- [x] **Phase 3: Update Test Fakes & Mock Implementations**
  - [x] Implement `indexBatch` and `embedBatch` in `src/application/use_cases/save_memory.test.ts`.
  - [x] Implement `indexBatch` and `embedBatch` in `src/application/use_cases/update_memory.test.ts`.
  - [x] Implement `indexBatch` and `embedBatch` in `src/domain/services/memory_enrichment.test.ts`.

- [x] **Phase 4: Refactor Indexer to Use Batch Operations**
  - [x] Update `indexFile` inside `src/infrastructure/codebase_indexer.ts` to call `saveAll()`, `embedBatch()`, and `indexBatch()`.

- [x] **Phase 5: Write Tests & Verify**
  - [x] Add unit tests for batch saving in `src/infrastructure/file_codebase_chunk_repository.test.ts`.
  - [x] Add unit tests for batch indexing in `src/infrastructure/sqlite_vector_index.test.ts`.
  - [x] Add unit tests for batch embedding in `src/infrastructure/mcp_installers/json_file_installer.test.ts` (if applicable) or verify transformer capabilities.
  - [x] Run `npm run typecheck` to verify types are correct.
  - [x] Run `npm test` to ensure all 245+ tests pass successfully.
