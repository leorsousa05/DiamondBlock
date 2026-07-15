import { nanoid } from 'nanoid';
import { IndexCodebaseUseCase } from '../../../application/use_cases/index_codebase.js';
import { EvaluateCodebaseIndexUseCase } from '../../../application/use_cases/evaluate_codebase_index.js';
import { ApproximateTokenEstimator } from '../../../infrastructure/approximate_token_estimator.js';
import { sseManager } from '../sse_manager.js';
export const indexRoutes = async (app, opts) => {
    const { container } = opts;
    const { projectResolver, codebaseScanner, parsingPipeline, codebaseIndexRepository, codebaseChunkRepository, vectorIndex, embeddingProvider, orphanedChunkCleaner, memoryRepository, } = container;
    // GET /api/index/status?project=<p>
    app.get('/api/index/status', async (req, reply) => {
        const query = req.query;
        let projectId = query.project;
        if (!projectId) {
            const resolved = await projectResolver.resolve();
            if (resolved) {
                projectId = resolved.projectId;
            }
        }
        if (!projectId) {
            return reply.code(400).send({ error: 'project query param required' });
        }
        if (!codebaseIndexRepository) {
            return reply.send({ projectId, fileCount: 0, chunkCount: 0, lastIndexedAt: null });
        }
        const manifest = await codebaseIndexRepository.load(projectId);
        if (!manifest) {
            return reply.send({ projectId, fileCount: 0, chunkCount: 0, lastIndexedAt: null });
        }
        const fileCount = Object.keys(manifest.files).length;
        const chunkCount = Object.values(manifest.files).reduce((sum, entry) => sum + entry.chunkIds.length, 0);
        return reply.send({
            projectId: manifest.projectId,
            fileCount,
            chunkCount,
            lastIndexedAt: manifest.updatedAt,
        });
    });
    // GET /api/index/chunks?project=<p>&limit=<n>
    app.get('/api/index/chunks', async (req, reply) => {
        const query = req.query;
        let projectId = query.project;
        const limit = parseInt(query.limit ?? '20', 10);
        if (!projectId) {
            const resolved = await projectResolver.resolve();
            if (resolved) {
                projectId = resolved.projectId;
            }
        }
        if (!projectId) {
            return reply.code(400).send({ error: 'project query param required' });
        }
        if (!codebaseChunkRepository) {
            return reply.send([]);
        }
        const chunks = await codebaseChunkRepository.list({ projectId, limit });
        const mapped = chunks.map((c) => ({
            ...c,
            chunkType: c.metadata?.chunkType ?? 'file',
        }));
        return reply.send(mapped);
    });
    // GET /api/index/search?q=<query>&project=<p>&limit=<n>
    app.get('/api/index/search', async (req, reply) => {
        const query = req.query;
        const q = query.q;
        let projectId = query.project;
        const limit = parseInt(query.limit ?? '10', 10);
        if (!q) {
            return reply.code(400).send({ error: 'q query param required' });
        }
        if (!projectId) {
            const resolved = await projectResolver.resolve();
            if (resolved) {
                projectId = resolved.projectId;
            }
        }
        // Semantic search via vector index if embedding provider is available
        if (await embeddingProvider.isAvailable()) {
            try {
                const embedding = await embeddingProvider.embed(q);
                const results = await vectorIndex.search(embedding, limit, projectId ? { scope: `project/${projectId}` } : undefined);
                const fullChunks = await Promise.all(results.map(async (r) => {
                    if (!codebaseChunkRepository)
                        return null;
                    const chunk = await codebaseChunkRepository.findById(r.id);
                    return chunk ? { ...chunk, chunkType: chunk.metadata?.chunkType ?? 'file', score: r.score } : null;
                }));
                return reply.send(fullChunks.filter(Boolean));
            }
            catch {
                // fall through to empty
            }
        }
        return reply.send([]);
    });
    app.post('/api/index/evaluate', async (req, reply) => {
        if (!codebaseScanner || !parsingPipeline || !codebaseIndexRepository || !codebaseChunkRepository) {
            return reply.code(503).send({ error: 'Indexing infrastructure not available' });
        }
        const body = (req.body ?? {});
        const query = typeof body.query === 'string' ? body.query.trim() : '';
        if (!query) {
            return reply.code(400).send({ error: 'query is required' });
        }
        const limit = body.limit === undefined ? 5 : Number(body.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
            return reply.code(400).send({ error: 'limit must be an integer between 1 and 50' });
        }
        const projectPath = typeof body.projectPath === 'string' && body.projectPath.trim()
            ? body.projectPath.trim()
            : process.cwd();
        let projectId = typeof body.projectId === 'string' && body.projectId.trim()
            ? body.projectId.trim()
            : undefined;
        if (!projectId) {
            const resolved = await projectResolver.resolve(projectPath);
            projectId = resolved?.projectId;
        }
        if (!projectId) {
            return reply.code(400).send({ error: 'Could not resolve project from projectPath' });
        }
        const expectedFiles = Array.isArray(body.expectedFiles)
            ? body.expectedFiles.filter((value) => typeof value === 'string' && value.trim().length > 0)
            : [];
        const expectedSymbols = Array.isArray(body.expectedSymbols)
            ? body.expectedSymbols.filter((value) => typeof value === 'string' && value.trim().length > 0)
            : [];
        try {
            const useCase = new EvaluateCodebaseIndexUseCase({
                scanner: codebaseScanner,
                pipeline: parsingPipeline,
                indexRepository: codebaseIndexRepository,
                codebaseChunkRepository,
                vectorIndex,
                embeddingProvider,
                tokenEstimator: new ApproximateTokenEstimator(),
            });
            const report = await useCase.execute({
                projectId,
                rootPath: projectPath,
                fixtureName: 'web',
                force: body.force === true,
                limit,
                queries: [{
                        id: 'web-query',
                        query,
                        expectedFiles,
                        expectedSymbols,
                        limit,
                    }],
            });
            return reply.send(report);
        }
        catch (error) {
            return reply.code(500).send({
                error: error instanceof Error ? error.message : 'Index evaluation failed',
            });
        }
    });
    // POST /api/index/run
    app.post('/api/index/run', async (req, reply) => {
        if (!codebaseScanner || !parsingPipeline || !codebaseIndexRepository || !codebaseChunkRepository) {
            return reply.code(503).send({ error: 'Indexing infrastructure not available' });
        }
        const body = (req.body ?? {});
        const operationId = nanoid();
        sseManager.createChannel(operationId);
        reply.code(202).send({ operationId });
        const useCase = new IndexCodebaseUseCase(projectResolver, codebaseScanner, parsingPipeline, codebaseIndexRepository, codebaseChunkRepository, memoryRepository, vectorIndex, embeddingProvider);
        setImmediate(async () => {
            try {
                const result = await useCase.execute({
                    projectPath: typeof body.projectPath === 'string' ? body.projectPath : undefined,
                    projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
                    force: body.force === true,
                    dryRun: body.dryRun === true,
                }, {
                    onScanStart: () => {
                        sseManager.send(operationId, 'progress', { phase: 'scan', message: 'Scanning files…' });
                    },
                    onScanComplete: (files) => {
                        sseManager.send(operationId, 'progress', {
                            phase: 'scan',
                            total: files.length,
                            message: `Found ${files.length} files`,
                        });
                    },
                    onFileStart: (_file, current, total) => {
                        sseManager.send(operationId, 'progress', {
                            phase: 'index',
                            current,
                            total,
                            message: `Indexing file ${current}/${total}`,
                        });
                    },
                    onSavingStart: () => {
                        sseManager.send(operationId, 'progress', { phase: 'save', message: 'Saving chunks…' });
                    },
                });
                sseManager.complete(operationId, result);
            }
            catch (err) {
                sseManager.error(operationId, err instanceof Error ? err.message : String(err));
            }
        });
    });
    // POST /api/index/purge
    app.post('/api/index/purge', async (req, reply) => {
        const body = (req.body ?? {});
        let projectId = body.projectId;
        if (!projectId) {
            const resolved = await projectResolver.resolve();
            if (resolved) {
                projectId = resolved.projectId;
            }
        }
        if (!projectId) {
            return reply.code(400).send({ error: 'projectId required' });
        }
        let chunksDeleted = 0;
        if (codebaseChunkRepository) {
            chunksDeleted = await codebaseChunkRepository.purge(projectId);
        }
        if (codebaseIndexRepository) {
            await codebaseIndexRepository.delete(projectId);
        }
        return reply.send({ projectId, chunksDeleted, deleted: chunksDeleted });
    });
    // POST /api/index/clean-orphans
    app.post('/api/index/clean-orphans', async (req, reply) => {
        const body = (req.body ?? {});
        let projectId = body.projectId;
        if (!projectId) {
            const resolved = await projectResolver.resolve();
            if (resolved) {
                projectId = resolved.projectId;
            }
        }
        if (!projectId) {
            return reply.code(400).send({ error: 'projectId required' });
        }
        if (!orphanedChunkCleaner) {
            return reply.send({ cleaned: 0, message: 'Orphaned chunk cleaner not available' });
        }
        const result = await orphanedChunkCleaner.clean(projectId);
        return reply.send(result);
    });
};
//# sourceMappingURL=index.routes.js.map