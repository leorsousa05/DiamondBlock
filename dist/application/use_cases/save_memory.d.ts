import { type MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { MemoryEnrichmentService } from '../../domain/services/memory_enrichment.js';
export interface SaveMemoryInput {
    title: string;
    content: string;
    type: MemoryInput['type'];
    scope?: string;
    projectId?: string;
    source?: string;
    tags?: string[];
    confidence?: number;
}
export declare class SaveMemoryUseCase {
    private readonly memoryRepository;
    private readonly vectorIndex;
    private readonly embeddingProvider;
    private readonly enrichmentService?;
    constructor(memoryRepository: MemoryRepository, vectorIndex: VectorIndex, embeddingProvider: EmbeddingProvider, enrichmentService?: MemoryEnrichmentService | undefined);
    execute(input: SaveMemoryInput): Promise<{
        id: string;
    }>;
    private resolveScope;
}
//# sourceMappingURL=save_memory.d.ts.map