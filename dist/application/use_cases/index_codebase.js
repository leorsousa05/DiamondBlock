import { Scope } from '../../domain/scope.js';
import { CodebaseIndexer } from '../../infrastructure/codebase_indexer.js';
export class IndexCodebaseUseCase {
    projectResolver;
    codebaseScanner;
    parsingPipeline;
    codebaseIndexRepository;
    codebaseChunkRepository;
    memoryRepository;
    vectorIndex;
    embeddingProvider;
    indexerFactory;
    constructor(projectResolver, codebaseScanner, parsingPipeline, codebaseIndexRepository, codebaseChunkRepository, memoryRepository, vectorIndex, embeddingProvider, indexerFactory) {
        this.projectResolver = projectResolver;
        this.codebaseScanner = codebaseScanner;
        this.parsingPipeline = parsingPipeline;
        this.codebaseIndexRepository = codebaseIndexRepository;
        this.codebaseChunkRepository = codebaseChunkRepository;
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
        await this.cleanupLegacyManifest(projectId);
        const indexer = this.indexerFactory?.({
            scanner: this.codebaseScanner,
            pipeline: this.parsingPipeline,
            indexRepository: this.codebaseIndexRepository,
            codebaseChunkRepository: this.codebaseChunkRepository,
            vectorIndex: this.vectorIndex,
            embeddingProvider: this.embeddingProvider,
        }) ??
            new CodebaseIndexer({
                scanner: this.codebaseScanner,
                pipeline: this.parsingPipeline,
                indexRepository: this.codebaseIndexRepository,
                codebaseChunkRepository: this.codebaseChunkRepository,
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
    async cleanupLegacyManifest(projectId) {
        const manifest = await this.codebaseIndexRepository.load(projectId);
        if (!manifest)
            return;
        const hasLegacyEntries = Object.values(manifest.files).some((entry) => 'memoryIds' in entry && Array.isArray(entry.memoryIds));
        if (!hasLegacyEntries)
            return;
        // Remove old code memories referenced by the legacy manifest and their vectors,
        // then delete the manifest so the indexer will treat every file as new.
        const referencedMemoryIds = new Set();
        for (const entry of Object.values(manifest.files)) {
            const legacyEntry = entry;
            if ('memoryIds' in legacyEntry && Array.isArray(legacyEntry.memoryIds)) {
                for (const id of legacyEntry.memoryIds) {
                    if (typeof id === 'string') {
                        referencedMemoryIds.add(id);
                    }
                }
            }
        }
        for (const memoryId of referencedMemoryIds) {
            try {
                await this.memoryRepository.delete(memoryId);
            }
            catch {
                // ignore
            }
            try {
                await this.vectorIndex.remove(memoryId);
            }
            catch {
                // ignore
            }
        }
        await this.codebaseIndexRepository.delete(projectId);
    }
}
//# sourceMappingURL=index_codebase.js.map