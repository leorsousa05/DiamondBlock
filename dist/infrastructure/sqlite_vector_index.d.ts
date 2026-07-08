import type { Memory } from '../domain/memory.js';
import type { SearchResult, VectorIndex, VectorSearchOptions } from '../application/ports/vector_index.js';
export interface SqliteVectorIndexOptions {
    dbPath: string;
}
export declare class SqliteVectorIndex implements VectorIndex {
    private db;
    private readonly dbPath;
    constructor(options: SqliteVectorIndexOptions);
    private getDb;
    private initialize;
    index(memory: Memory, embedding: number[]): Promise<void>;
    search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
    remove(id: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=sqlite_vector_index.d.ts.map