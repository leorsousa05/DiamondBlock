import type { MemoryRepository } from './application/ports/memory_repository.js';
import type { SessionRepository } from './application/ports/session_repository.js';
import type { VectorIndex } from './application/ports/vector_index.js';
import type { EmbeddingProvider } from './application/ports/embedding_provider.js';
import type { ConfigStore } from './application/ports/config_store.js';
import type { MemoryEnrichmentService } from './domain/services/memory_enrichment.js';
import type { ProjectResolver } from './application/ports/project_resolver.js';
export interface Container {
    memoryRepository: MemoryRepository;
    sessionRepository: SessionRepository;
    vectorIndex: VectorIndex;
    embeddingProvider: EmbeddingProvider;
    configStore: ConfigStore;
    projectResolver: ProjectResolver;
    enrichmentService?: MemoryEnrichmentService;
}
export declare function setContainer(c: Container): void;
export declare function getContainer(): Container;
//# sourceMappingURL=container.d.ts.map