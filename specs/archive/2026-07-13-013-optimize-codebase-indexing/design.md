# Design Spec: Optimize Codebase Indexing

## 1. Directory Structure Changes
The following files will be modified to support the optimization pipeline:

```
src/
├── application/
│   └── ports/
│       ├── codebase_chunk_repository.ts   (MODIFIED: add saveAll)
│       ├── embedding_provider.ts          (MODIFIED: add embedBatch)
│       └── vector_index.ts                (MODIFIED: add indexBatch)
├── infrastructure/
│   ├── file_codebase_chunk_repository.ts  (MODIFIED: implement saveAll)
│   ├── sqlite_vector_index.ts             (MODIFIED: implement indexBatch)
│   ├── local_embedding_provider.ts        (MODIFIED: implement embedBatch using batch Xenova)
│   ├── openai_embedding_provider.ts       (MODIFIED: implement embedBatch using bulk OpenAI api)
│   └── codebase_indexer.ts                (MODIFIED: refactor indexFile to use batch calls)
├── domain/
│   └── services/
│       └── memory_enrichment.test.ts      (MODIFIED: update Fake classes)
└── application/use_cases/
    ├── save_memory.test.ts                (MODIFIED: update Fake classes)
    └── update_memory.test.ts              (MODIFIED: update Fake classes)
```

---

## 2. Patterns & Architectural Pillars
* **Bulk/Batch Pattern:** We shift our interface interactions from one-by-one items to batch operations. This minimizes serialization, filesystem reads/writes, network overhead, and database transaction lock setups.
* **Clean Architecture:** We keep domain logic decoupled from database technology. The ports are modified, and infrastructure implementations implement the new capabilities without breaking clean architecture boundaries.
* **Repository Pattern:** `CodebaseChunkRepository` isolates file system layout details. Implementing `saveAll` inside the repository shields `CodebaseIndexer` from knowing how JSON-based indexes are written.

---

## 3. Formal Contracts (Interface Definitions)

### 3.1 `CodebaseChunkRepository` Port Update
```typescript
export interface CodebaseChunkRepository {
  save(chunk: CodebaseChunk): Promise<void>;
  saveAll(chunks: CodebaseChunk[]): Promise<void>; // ADDED
  findById(id: string): Promise<CodebaseChunk | null>;
  delete(id: string): Promise<void>;
  list(options: CodebaseChunkListOptions): Promise<CodebaseChunk[]>;
  purge(projectId: string): Promise<number>;
}
```

### 3.2 `VectorIndex` Port Update
```typescript
export interface VectorIndex {
  index(item: VectorIndexable, embedding: number[]): Promise<void>;
  indexBatch(items: Array<{ item: VectorIndexable; embedding: number[] }>): Promise<void>; // ADDED
  search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
```

### 3.3 `EmbeddingProvider` Port Update
```typescript
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>; // ADDED
  isAvailable(): Promise<boolean>;
}
```

---

## 4. Implementation Strategy & Logic Flows

### 4.1 Batch saving chunks
In `FileCodebaseChunkRepository`, `saveAll` writes individual JSON files for each chunk, and only loads, updates, and saves `chunk-index.json` **once** at the end.
```typescript
  async saveAll(chunks: CodebaseChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    for (const chunk of chunks) {
      const path = this.idToPath(chunk.id, chunk.projectId);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(this.serialize(chunk), null, 2), 'utf-8');
    }

    const index = await this.loadIndex();
    for (const chunk of chunks) {
      index[chunk.id] = chunk.projectId;
    }
    await this.saveIndex(index);
  }
```

### 4.2 Batch writing vector index in single transaction
In `SqliteVectorIndex`, `indexBatch` prepares statements once and runs all updates inside a single database transaction.
```typescript
  async indexBatch(items: Array<{ item: VectorIndexable; embedding: number[] }>): Promise<void> {
    if (items.length === 0) return;
    await mkdir(dirname(this.dbPath), { recursive: true });
    const db = this.getDb();

    const insertMemory = db.prepare(`
      INSERT OR REPLACE INTO memories (id, type, scope, title, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertVec = db.prepare(`
      INSERT INTO vec_memories (memory_id, embedding)
      VALUES (?, ?)
    `);

    const updateVec = db.prepare(`
      UPDATE vec_memories SET embedding = ? WHERE memory_id = ?
    `);

    const deleteVec = db.prepare(`
      DELETE FROM vec_memories WHERE memory_id = ?
    `);

    const selectVec = db.prepare('SELECT 1 FROM vec_memories WHERE memory_id = ?');

    const transaction = db.transaction(() => {
      for (const { item, embedding } of items) {
        insertMemory.run(item.id, item.type, item.scope, item.title, item.source);

        const vectorJson = JSON.stringify(embedding);
        const existing = selectVec.get(item.id);
        if (existing) {
          try {
            updateVec.run(vectorJson, item.id);
          } catch {
            deleteVec.run(item.id);
            insertVec.run(item.id, vectorJson);
          }
        } else {
          insertVec.run(item.id, vectorJson);
        }
      }
    });

    transaction();
  }
```

### 4.3 Batch local embedding generation
In `LocalEmbeddingProvider`, we call the feature extractor on an array of texts. Then, we slice the flat data array according to the dimension size.
```typescript
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getExtractor();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    const size = output.dims[1];
    const data = output.data;
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const start = i * size;
      const end = start + size;
      result.push(Array.from(data.slice(start, end)) as number[]);
    }
    return result;
  }
```

### 4.4 Batch OpenAI embedding generation
In `OpenAIEmbeddingProvider`, we send the string array as `input` in the POST body, and map the returned elements.
```typescript
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      // error handling logic similar to embed
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data.map((d) => d.embedding);
  }
```

### 4.5 Updating CodebaseIndexer
Refactor `indexFile` in [codebase_indexer.ts](file:///home/arch/codes/diamondblock/src/infrastructure/codebase_indexer.ts) to parse files, create `CodebaseChunk` entities, batch-save them via `saveAll()`, request batch embeddings via `embedBatch()`, and index them via `indexBatch()`.

---

## 5. Test Plan
* **`FileCodebaseChunkRepository` Tests:**
  - Verify that `saveAll` writes multiple individual chunk files.
  - Verify that `saveAll` updates `chunk-index.json` exactly once and keeps mapping valid.
* **`SqliteVectorIndex` Tests:**
  - Verify that `indexBatch` executes within a single transaction.
  - Verify that query search on batch-indexed items works properly.
* **`LocalEmbeddingProvider` / `OpenAIEmbeddingProvider` Tests:**
  - Verify that `embedBatch` returns matching arrays of dimensions.
* **`CodebaseIndexer` Integration Tests:**
  - Verify that indexing is fully functional and creates proper chunks.
