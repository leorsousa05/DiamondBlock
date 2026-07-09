---
created_at: 2026-07-08
updated_at: 2026-07-08
---

# Design: Separate Codebase Index from Memory Storage

## 7 Analysis Questions

### 1. Domain and bounded context placement?

This change splits the existing **Memory & Knowledge** context into two subsystems:

- **Memories** — user-captured, distilled, or manually created knowledge. Kept in `MemoryRepository`.
- **Codebase Index** — derived search index of code chunks. Kept in `CodebaseChunkRepository`.

Both share the same `VectorIndex` for embedding search, but their primary persistence is separate.

### 2. Core responsibilities of new/changed components?

- **`CodebaseChunkRepository` port** — persistence contract for code chunks: save, find, delete, list, purge by project.
- **`FileCodebaseChunkRepository`** — file-based implementation storing one JSON file per chunk under `vault/CodebaseChunks/<projectId>/<chunkId>.json`.
- **`VectorIndex` port** — generalized to operate on `VectorIndexable` instead of `Memory`, so memories and chunks can coexist.
- **`SqliteVectorIndex`** — keeps the same sqlite-vec backing store; the `memories` metadata table becomes the generic metadata table for any indexed item.
- **`CodebaseIndexManifest` / `FileIndexEntry`** — change `memoryIds` to `chunkIds`.
- **`CodebaseIndexer`** — persists chunks via `CodebaseChunkRepository`, indexes embeddings by chunk id.
- **`IndexCodebaseUseCase`** — updated wiring; no behavior change from the CLI perspective.
- **`OrphanedChunkCleaner`** — now deletes chunk files and vector entries instead of memory files.
- **CLI** — new `index list`, `index search`, updated `index --purge`/`--clean-orphans`.

### 3. Contracts to define or change?

```ts
// src/application/ports/codebase_chunk_repository.ts
export interface CodebaseChunk {
  id: string;
  projectId: string;
  scope: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  title: string;
  source: string;
  tags: string[];
  confidence: number;
  metadata?: ChunkMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodebaseChunkInput {
  id: string;
  projectId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  title: string;
  source: string;
  tags?: string[];
  confidence?: number;
  metadata?: ChunkMetadata;
}

export interface CodebaseChunkRepository {
  save(chunk: CodebaseChunk): Promise<void>;
  findById(id: string): Promise<CodebaseChunk | null>;
  delete(id: string): Promise<void>;
  list(options: { projectId: string; limit?: number; offset?: number }): Promise<CodebaseChunk[]>;
  purge(projectId: string): Promise<number>;
}
```

```ts
// src/application/ports/vector_index.ts
export interface VectorIndexable {
  id: string;
  type: string;
  scope: string;
  title: string;
  content: string;
  source: string;
}

export interface VectorIndex {
  index(item: VectorIndexable, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
```

```ts
// src/application/ports/codebase_index_repository.ts
export interface FileIndexEntry {
  relativePath: string;
  contentHash: string;
  indexedAt: string;
  chunkIds: string[];
}
```

```ts
// src/infrastructure/file_codebase_chunk_repository.ts
export interface FileCodebaseChunkRepositoryOptions {
  basePath: string;
}

export class FileCodebaseChunkRepository implements CodebaseChunkRepository {
  constructor(options: FileCodebaseChunkRepositoryOptions);
  // implementation details in code
}
```

### 4. Which parts need tests per TDD skip criteria?

No component qualifies for test skip. Everything involves branching, persistence, or public API surface.

Required tests:

- `FileCodebaseChunkRepository` — save, find, delete, list, purge.
- `SqliteVectorIndex` — generalized indexing/search with both memory-like and chunk-like items.
- `CodebaseIndexer` — chunk persistence, incremental updates, legacy manifest migration.
- `OrphanedChunkCleaner` — removes only orphaned chunks, leaves memories untouched.
- `IndexCodebaseUseCase` — wiring still works after contract changes.

### 5. Architecture that minimizes ambiguity?

- **Repository Pattern** — `CodebaseChunkRepository` isolates chunk persistence from the indexer and CLI.
- **Adapter Pattern** — `VectorIndexable` lets the vector store index any entity without knowing whether it is a memory or a chunk.
- **Clean Architecture / Ports & Adapters** — domain (`CodeChunk`) and application ports do not depend on file layout or sqlite schema.
- **Backward Compatibility** — legacy manifests are detected and trigger reindexing; no manual migration.

### 6. Project structure changes needed?

```
src/
├── application/
│   └── ports/
│       ├── codebase_chunk_repository.ts   NEW
│       ├── codebase_index_repository.ts   MODIFY
│       └── vector_index.ts                MODIFY
├── domain/
│   ├── code_chunk.ts                      MODIFY (remove codeChunkToMemory or keep as legacy adapter)
│   └── services/
│       ├── orphaned_chunk_cleaner.ts      MODIFY
│       └── orphaned_chunk_cleaner.test.ts NEW/MODIFY
├── infrastructure/
│   ├── file_codebase_chunk_repository.ts  NEW
│   ├── file_codebase_chunk_repository.test.ts NEW
│   ├── sqlite_vector_index.ts             MODIFY
│   ├── sqlite_vector_index.test.ts        MODIFY
│   ├── file_codebase_index_repository.ts  MODIFY
│   ├── codebase_indexer.ts                MODIFY
│   ├── codebase_indexer.test.ts           MODIFY
│   └── ...
├── presentation/
│   └── cli/
│       └── index.ts                       MODIFY
├── application/use_cases/
│   ├── index_codebase.ts                  MODIFY
│   └── index_codebase.test.ts             MODIFY
└── container_factory.ts                   MODIFY
```

### 7. Key trade-offs?

- **JSON vs Markdown for chunk files:** JSON chosen because chunk metadata is strongly typed and machine-generated. Markdown is better for human-edited memories.
- **Shared vector store vs separate vector store:** Shared sqlite-vec database keeps the vault small and avoids duplicate model downloads. The metadata table remains generic.
- **Automatic migration vs manual `--force`:** Automatic migration is chosen because users should not need to know the storage changed. The cost is one full reindex on the first run after upgrade.
- **`codeChunkToMemory` kept or removed:** Removed from the indexer path but can be deleted if no other code uses it. The spec will decide based on usage during implementation.

---

## 🧱 Patterns Applied

- **Repository Pattern:** `CodebaseChunkRepository` hides file-system details from the indexer.
- **Adapter Pattern:** `VectorIndexable` allows the vector store to index memories and chunks uniformly.
- **Ports & Adapters:** CLI and use cases depend only on repository ports, not on JSON files or sqlite.
- **Backward Compatibility:** Legacy manifest detection keeps old vaults working.

---

## 🚀 Implementation Strategy

### Phase 1 — Vector index generalization

1. Introduce `VectorIndexable` interface in `src/application/ports/vector_index.ts`.
2. Change `VectorIndex.index(item: VectorIndexable, embedding)` and update `SqliteVectorIndex` to accept the new interface.
3. Make `Memory` satisfy `VectorIndexable` (it already does) without changing the domain type.
4. Update `SqliteVectorIndex` tests to cover generic items.

### Phase 2 — Codebase chunk repository

1. Create `src/application/ports/codebase_chunk_repository.ts` with `CodebaseChunk`, `CodebaseChunkInput`, and `CodebaseChunkRepository`.
2. Create `src/infrastructure/file_codebase_chunk_repository.ts`.
   - Directory layout: `vault/CodebaseChunks/<projectId>/<chunkId>.json`.
   - JSON schema: `{ id, projectId, scope, filePath, startLine, endLine, language, content, title, source, tags, confidence, metadata?, createdAt, updatedAt }`.
   - `list` filters by `projectId` and sorts by `updatedAt` descending.
   - `purge` deletes all chunk files for a project and returns the count.
3. Create unit tests.

### Phase 3 — Indexer contract changes

1. Update `src/application/ports/codebase_index_repository.ts`:
   - Rename `FileIndexEntry.memoryIds` to `chunkIds`.
2. Update `src/infrastructure/file_codebase_index_repository.ts` helper functions.
3. Update `CodebaseIndexer`:
   - Accept `CodebaseChunkRepository` in options.
   - Build `CodebaseChunk` objects from `CodeChunk` instead of converting to `Memory`.
   - Save chunks via `CodebaseChunkRepository`.
   - Index embeddings using chunk id.
   - On removal, delete chunks via repository and remove vector entries.
4. Detect legacy manifests that contain `memoryIds`:
   - If detected, treat all previously indexed files as `updated` (force reindex) and purge old code memories by `source='codebase-indexer'`.
5. Update tests.

### Phase 4 — Orphaned chunk cleaner

1. Update `OrphanedChunkCleaner` to use `CodebaseChunkRepository`.
2. Remove memory-specific logic; operate on chunks in the project scope.
3. Add/update tests.

### Phase 5 — CLI commands

1. Add `dblock index list`:
   - Options: `--project`, `--limit`.
   - Lists chunks with columns: ID, File, Lines, Language.
2. Add `dblock index search <query>`:
   - Options: `--project`, `--limit`.
   - Embeds query, searches vector index scoped to `project/<projectId>`, loads chunks via repository, prints ranked results.
3. Update `dblock index --purge`:
   - Delete the manifest.
   - Delete all chunks via `CodebaseChunkRepository.purge`.
   - Remove vector entries for each chunk id.
4. Update `dblock index --clean-orphans`:
   - Use `OrphanedChunkCleaner`.
5. Keep `--force`, `--dry-run`, `--status` unchanged.

### Phase 6 — Container wiring and migration

1. Update `container_factory.ts`:
   - Register `FileCodebaseChunkRepository`.
   - Inject it into `IndexCodebaseUseCase`/`CodebaseIndexer`.
   - Inject it into `OrphanedChunkCleaner`.
2. Update `IndexCodebaseUseCase` constructor and tests.
3. Run `npm run typecheck` and `npm test`.

### Phase 7 — Living docs and spec closure

1. Update `specs/living/diamondblock-core.md` to describe the separate codebase index storage.
2. Mark `specs/changes/008-separate-codebase-index/.spec.yaml` status as `completed`.

---

## 🔌 Contracts & Stubs

### CodebaseChunkRepository port

```ts
export interface CodebaseChunkRepository {
  save(chunk: CodebaseChunk): Promise<void>;
  findById(id: string): Promise<CodebaseChunk | null>;
  delete(id: string): Promise<void>;
  list(options: { projectId: string; limit?: number; offset?: number }): Promise<CodebaseChunk[]>;
  purge(projectId: string): Promise<number>;
}
```

### VectorIndex port

```ts
export interface VectorIndex {
  index(item: VectorIndexable, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
```

### File index entry

```ts
export interface FileIndexEntry {
  relativePath: string;
  contentHash: string;
  indexedAt: string;
  chunkIds: string[];
}
```

---

## Test Plan

- **FileCodebaseChunkRepository**
  - Save a chunk and read it back.
  - List chunks filtered by project.
  - Purge removes only chunks from the target project.
  - Delete removes the file.

- **SqliteVectorIndex**
  - Index and search generic `VectorIndexable` items.
  - Scope filter works for chunk-like scopes.
  - Remove by id works for both memories and chunks.

- **CodebaseIndexer**
  - Saves chunks to `CodebaseChunkRepository` instead of `MemoryRepository`.
  - Legacy manifest with `memoryIds` triggers reindex and cleanup.
  - Incremental indexing preserves unchanged files and updates changed files.
  - Removed files delete chunks and vector entries.

- **OrphanedChunkCleaner**
  - Removes chunks not present in the manifest.
  - Does not touch user memories.

- **CLI**
  - `dblock index list` prints chunks for the current project.
  - `dblock index search` prints ranked chunk results.
  - `dblock index --purge` removes chunks and vectors.

---

## Risk Assessment

- **Impact:** High. Touches indexer persistence and CLI surface.
- **Compatibility:** Backward-compatible via legacy manifest detection.
- **Performance:** First run after upgrade reindexes the project once.
- **Complexity:** Moderate. Adds a new repository but removes the memory adapter path.
- **Deferred:** New language parsers, knowledge graph, MCP symbol tools.

## Subagent Parallelization

This spec has clear independent workstreams:

```yaml
subagents:
  approved: true
  components:
    - name: "Vector index generalization"
      scope: "Introduce VectorIndexable, update VectorIndex port and SqliteVectorIndex."
      files: "src/application/ports/vector_index.ts, src/infrastructure/sqlite_vector_index.ts, src/infrastructure/sqlite_vector_index.test.ts"
      constraints: "Do NOT touch repositories or indexer. Keep the same sqlite-vec database."
    - name: "Codebase chunk repository"
      scope: "Implement CodebaseChunkRepository port and FileCodebaseChunkRepository."
      files: "src/application/ports/codebase_chunk_repository.ts, src/infrastructure/file_codebase_chunk_repository.ts, src/infrastructure/file_codebase_chunk_repository.test.ts"
      constraints: "Do NOT touch the indexer or vector store. Store chunks as JSON under vault/CodebaseChunks/<projectId>."
    - name: "Indexer and cleaner migration"
      scope: "Update CodebaseIndexer, OrphanedChunkCleaner, and related tests to use the new chunk repository."
      files: "src/infrastructure/codebase_indexer.ts, src/infrastructure/codebase_indexer.test.ts, src/domain/services/orphaned_chunk_cleaner.ts, src/domain/services/orphaned_chunk_cleaner.test.ts, src/application/ports/codebase_index_repository.ts, src/infrastructure/file_codebase_index_repository.ts"
      constraints: "Do NOT touch CLI or container wiring. Support legacy manifests with memoryIds."
```

CLI updates, container wiring, and integration should be done sequentially after the components above.
