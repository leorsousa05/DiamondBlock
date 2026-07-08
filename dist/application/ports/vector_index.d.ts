import type { Memory } from '../../domain/memory.js';
export interface SearchResult {
    id: string;
    score: number;
}
export interface VectorSearchOptions {
    scope?: string;
}
export interface VectorIndex {
    index(memory: Memory, embedding: number[]): Promise<void>;
    search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
    remove(id: string): Promise<void>;
    close?(): Promise<void>;
}
//# sourceMappingURL=vector_index.d.ts.map