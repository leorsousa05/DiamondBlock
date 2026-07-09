import type { CodebaseChunkRepository } from '../../application/ports/codebase_chunk_repository.js';
import type { VectorIndex } from '../../application/ports/vector_index.js';
import type { CodebaseIndexRepository } from '../../application/ports/codebase_index_repository.js';
export interface OrphanedChunkCleanerOptions {
    codebaseChunkRepository: CodebaseChunkRepository;
    vectorIndex: VectorIndex;
    codebaseIndexRepository: CodebaseIndexRepository;
}
export interface OrphanedChunkCleanerResult {
    projectId: string;
    chunkIdsRemoved: number;
}
export declare class OrphanedChunkCleaner {
    private readonly options;
    constructor(options: OrphanedChunkCleanerOptions);
    clean(projectId: string): Promise<OrphanedChunkCleanerResult>;
}
//# sourceMappingURL=orphaned_chunk_cleaner.d.ts.map