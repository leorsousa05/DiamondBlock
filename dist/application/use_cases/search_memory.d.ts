import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
export interface SearchMemoryInput {
    query: string;
    scope?: string;
    limit?: number;
}
export interface SearchMemoryResult {
    id: string;
    title: string;
    score: number;
    scope: string;
    path: string;
}
export declare class SearchMemoryUseCase {
    private readonly memoryRepository;
    private readonly vectorIndex;
    private readonly embeddingProvider;
    constructor(memoryRepository: MemoryRepository, vectorIndex: VectorIndex, embeddingProvider: EmbeddingProvider);
    execute(input: SearchMemoryInput): Promise<SearchMemoryResult[]>;
    private resolveMemories;
}
//# sourceMappingURL=search_memory.d.ts.map