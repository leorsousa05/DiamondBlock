import { Scope } from '../../domain/scope.js';
import { CodebaseIndexer } from '../../infrastructure/codebase_indexer.js';
export class IndexCodebaseUseCase {
    projectResolver;
    codebaseScanner;
    codeChunker;
    codebaseIndexRepository;
    memoryRepository;
    vectorIndex;
    embeddingProvider;
    indexerFactory;
    constructor(projectResolver, codebaseScanner, codeChunker, codebaseIndexRepository, memoryRepository, vectorIndex, embeddingProvider, indexerFactory) {
        this.projectResolver = projectResolver;
        this.codebaseScanner = codebaseScanner;
        this.codeChunker = codeChunker;
        this.codebaseIndexRepository = codebaseIndexRepository;
        this.memoryRepository = memoryRepository;
        this.vectorIndex = vectorIndex;
        this.embeddingProvider = embeddingProvider;
        this.indexerFactory = indexerFactory;
    }
    async execute(input, progress) {
        const projectPath = input.projectPath ?? process.cwd();
        let projectId;
        if (input.projectId) {
            projectId = Scope.normalizeProjectId(input.projectId);
        }
        else {
            const projectInfo = await this.projectResolver.resolve(projectPath);
            if (!projectInfo) {
                throw new Error(`Could not resolve project from path: ${projectPath}`);
            }
            projectId = projectInfo.projectId;
        }
        const indexer = this.indexerFactory?.({
            scanner: this.codebaseScanner,
            chunker: this.codeChunker,
            indexRepository: this.codebaseIndexRepository,
            memoryRepository: this.memoryRepository,
            vectorIndex: this.vectorIndex,
            embeddingProvider: this.embeddingProvider,
        }) ??
            new CodebaseIndexer({
                scanner: this.codebaseScanner,
                chunker: this.codeChunker,
                indexRepository: this.codebaseIndexRepository,
                memoryRepository: this.memoryRepository,
                vectorIndex: this.vectorIndex,
                embeddingProvider: this.embeddingProvider,
            });
        const result = await indexer.index(projectId, projectPath, {
            force: input.force,
            dryRun: input.dryRun,
            progress,
        });
        const scanned = result.added.length + result.updated.length + result.unchanged.length;
        const indexed = result.added.length + result.updated.length;
        return {
            projectId,
            scanned,
            indexed,
            removed: result.removed.length,
            chunksCreated: result.chunksCreated,
            chunksRemoved: result.chunksRemoved,
        };
    }
}
//# sourceMappingURL=index_codebase.js.map