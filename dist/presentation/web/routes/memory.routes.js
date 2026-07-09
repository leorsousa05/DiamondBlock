import { z } from 'zod';
import { SaveMemoryUseCase } from '../../../application/use_cases/save_memory.js';
import { SearchMemoryUseCase } from '../../../application/use_cases/search_memory.js';
import { UpdateMemoryUseCase } from '../../../application/use_cases/update_memory.js';
import { DeleteMemoryUseCase } from '../../../application/use_cases/delete_memory.js';
const SaveMemoryBodySchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    type: z.enum(['user', 'project', 'knowledge', 'distilled']),
    scope: z.string().optional(),
    projectId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
});
const UpdateMemoryBodySchema = z.object({
    title: z.string().optional(),
    content: z.string().optional(),
    type: z.enum(['user', 'project', 'knowledge', 'distilled']).optional(),
    scope: z.string().optional(),
    projectId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    append: z.boolean().optional(),
});
export const memoryRoutes = async (app, opts) => {
    const { container } = opts;
    const { memoryRepository, vectorIndex, embeddingProvider, enrichmentService } = container;
    // GET /api/memories
    app.get('/api/memories', async (req, reply) => {
        const query = req.query;
        const q = query.q;
        const scope = query.scope;
        const type = query.type;
        const limit = parseInt(query.limit ?? '20', 10);
        if (q) {
            const useCase = new SearchMemoryUseCase(memoryRepository, vectorIndex, embeddingProvider);
            const results = await useCase.execute({ query: q, scope, limit });
            const fullMemories = await Promise.all(results.map(async (r) => {
                const memory = await memoryRepository.findById(r.id);
                return memory ? { ...memory, score: r.score } : null;
            }));
            // Client-side filter fallback in search if type filter is requested
            const searchResults = fullMemories.filter(Boolean);
            if (type) {
                return reply.send(searchResults.filter((m) => m.type === type));
            }
            return reply.send(searchResults);
        }
        const memories = await memoryRepository.list({ scope, type, limit });
        return reply.send(memories);
    });
    // GET /api/memories/:id
    app.get('/api/memories/:id', async (req, reply) => {
        const { id } = req.params;
        const memory = await memoryRepository.findById(id);
        if (!memory) {
            return reply.code(404).send({ error: 'Memory not found' });
        }
        return reply.send(memory);
    });
    // POST /api/memories
    app.post('/api/memories', async (req, reply) => {
        const parseResult = SaveMemoryBodySchema.safeParse(req.body);
        if (!parseResult.success) {
            return reply.code(400).send({ error: 'Invalid request body', details: parseResult.error.issues });
        }
        const useCase = new SaveMemoryUseCase(memoryRepository, vectorIndex, embeddingProvider, enrichmentService);
        const result = await useCase.execute(parseResult.data);
        return reply.code(201).send(result);
    });
    // PATCH /api/memories/:id
    app.patch('/api/memories/:id', async (req, reply) => {
        const { id } = req.params;
        const parseResult = UpdateMemoryBodySchema.safeParse(req.body);
        if (!parseResult.success) {
            return reply.code(400).send({ error: 'Invalid request body', details: parseResult.error.issues });
        }
        const useCase = new UpdateMemoryUseCase(memoryRepository, vectorIndex, embeddingProvider, enrichmentService);
        try {
            await useCase.execute({ id, ...parseResult.data });
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('not found')) {
                return reply.code(404).send({ error: err.message });
            }
            throw err;
        }
        const updated = await memoryRepository.findById(id);
        return reply.send(updated);
    });
    // DELETE /api/memories/:id
    app.delete('/api/memories/:id', async (req, reply) => {
        const { id } = req.params;
        const useCase = new DeleteMemoryUseCase(memoryRepository, vectorIndex);
        await useCase.execute(id);
        return reply.code(204).send();
    });
    // POST /api/memories/purge
    app.post('/api/memories/purge', async (req, reply) => {
        const body = (req.body ?? {});
        const scope = body.scope;
        const projectId = body.projectId;
        const source = body.source;
        // List matching memories and delete them individually
        const all = await memoryRepository.list({ limit: 100000, scope });
        const toDelete = all.filter((m) => {
            if (projectId && !m.scope.includes(projectId))
                return false;
            if (source && m.source !== source)
                return false;
            return true;
        });
        const deleteUseCase = new DeleteMemoryUseCase(memoryRepository, vectorIndex);
        await Promise.all(toDelete.map((m) => deleteUseCase.execute(m.id)));
        return reply.send({ deleted: toDelete.length });
    });
};
//# sourceMappingURL=memory.routes.js.map