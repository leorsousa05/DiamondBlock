# Proposal: Optimize Codebase Indexing

## 1. Motivation
The current implementation of codebase indexing in DiamondBlock is extremely slow and susceptible to timeouts. In particular:
* **JSON Index Serialization overhead:** The chunk repository (`FileCodebaseChunkRepository`) reads and writes the entire `chunk-index.json` file once per chunk. For $N$ chunks, this represents an $O(N^2)$ write operation.
* **Database transaction overhead:** The SQLite vector index (`SqliteVectorIndex`) preparses and executes inserts individually per chunk inside a single-insert transaction, causing disk fsync overhead for every chunk.
* **Sequential embeddings generation:** The indexer makes sequential requests to the embedding provider per chunk, causing significant network/CPU delay.
* **Sequential file processing:** Files are processed one-by-one sequentially, preventing overlap of I/O, parsing, and embedding tasks.

## 2. Scope
This change aims to optimize the codebase indexing pipeline by:
- Modifying the `CodebaseChunkRepository` contract to support batch-saving (`saveAll`), consolidating index updates so `chunk-index.json` is written exactly once at the end of saving the batch.
- Modifying the `VectorIndex` contract to support batch indexing (`indexBatch`) so that all vector insertions are wrapped in a single database transaction.
- Modifying the `EmbeddingProvider` contract to support batch embeddings (`embedBatch`), utilizing bulk APIs for OpenAI and batch inference for local Xenova transformers.
- Updating `CodebaseIndexer` to chunk/embed/write in batches.

## 3. Constraints
* Must preserve local-first, private-by-default design principles.
* Must not break existing interfaces for non-code memories.
* Must not introduce complex external dependencies.
* Must keep SQLite + `sqlite-vec` as the vector indexing engine.
