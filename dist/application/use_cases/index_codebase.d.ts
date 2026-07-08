import type { ProjectResolver } from '../ports/project_resolver.js';
import type { CodebaseScanner } from '../ports/codebase_scanner.js';
import type { CodeChunker } from '../ports/code_chunker.js';
import type { CodebaseIndexRepository } from '../ports/codebase_index_repository.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import { CodebaseIndexer, type CodebaseIndexerProgress } from '../../infrastructure/codebase_indexer.js';
export interface IndexCodebaseInput {
    projectPath?: string;
    projectId?: string;
    force?: boolean;
    dryRun?: boolean;
}
export interface IndexCodebaseOutput {
    projectId: string;
    scanned: number;
    indexed: number;
    removed: number;
    chunksCreated: number;
    chunksRemoved: number;
}
export declare class IndexCodebaseUseCase {
    private readonly projectResolver;
    private readonly codebaseScanner;
    private readonly codeChunker;
    private readonly codebaseIndexRepository;
    private readonly memoryRepository;
    private readonly vectorIndex;
    private readonly embeddingProvider;
    private readonly indexerFactory?;
    constructor(projectResolver: ProjectResolver, codebaseScanner: CodebaseScanner, codeChunker: CodeChunker, codebaseIndexRepository: CodebaseIndexRepository, memoryRepository: MemoryRepository, vectorIndex: VectorIndex, embeddingProvider: EmbeddingProvider, indexerFactory?: ((deps: {
        scanner: CodebaseScanner;
        chunker: CodeChunker;
        indexRepository: CodebaseIndexRepository;
        memoryRepository: MemoryRepository;
        vectorIndex: VectorIndex;
        embeddingProvider: EmbeddingProvider;
    }) => CodebaseIndexer) | undefined);
    execute(input: IndexCodebaseInput, progress?: CodebaseIndexerProgress): Promise<IndexCodebaseOutput>;
}
//# sourceMappingURL=index_codebase.d.ts.map