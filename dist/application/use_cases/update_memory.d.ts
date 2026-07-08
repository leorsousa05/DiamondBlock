import { type MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { MemoryEnrichmentService } from '../../domain/services/memory_enrichment.js';
export interface UpdateMemoryInput {
    id: string;
    title?: string;
    content?: string;
    type?: MemoryInput['type'];
    scope?: string;
    projectId?: string;
    tags?: string[];
    confidence?: number;
    append?: boolean;
}
export declare class UpdateMemoryUseCase {
    private readonly memoryRepository;
    private readonly vectorIndex;
    private readonly embeddingProvider;
    private readonly enrichmentService?;
    constructor(memoryRepository: MemoryRepository, vectorIndex: VectorIndex, embeddingProvider: EmbeddingProvider, enrichmentService?: MemoryEnrichmentService | undefined);
    execute(input: UpdateMemoryInput): Promise<void>;
    private resolveScope;
}
//# sourceMappingURL=update_memory.d.ts.map