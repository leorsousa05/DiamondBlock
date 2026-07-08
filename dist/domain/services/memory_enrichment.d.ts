import { type Memory } from '../memory.js';
import type { MemoryRepository } from '../../application/ports/memory_repository.js';
import type { VectorIndex } from '../../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../../application/ports/embedding_provider.js';
import type { EnrichmentProvider } from '../../application/ports/enrichment_provider.js';
export interface MemoryEnrichmentOptions {
    confidenceThreshold?: number;
    maxTags?: number;
    maxEntities?: number;
}
export declare class MemoryEnrichmentService {
    private readonly memoryRepository;
    private readonly vectorIndex;
    private readonly embeddingProvider;
    private readonly enrichmentProvider;
    private readonly options;
    constructor(memoryRepository: MemoryRepository, vectorIndex: VectorIndex, embeddingProvider: EmbeddingProvider, enrichmentProvider: EnrichmentProvider, options?: MemoryEnrichmentOptions);
    enrich(memory: Memory): Promise<void>;
    private inferTags;
}
//# sourceMappingURL=memory_enrichment.d.ts.map