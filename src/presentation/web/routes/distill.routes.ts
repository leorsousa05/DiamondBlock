import { nanoid } from 'nanoid';
import type { FastifyPluginAsync } from 'fastify';
import { DistillSessionsUseCase } from '../../../application/use_cases/distill_sessions.js';
import type { Container } from '../../../container.js';
import { sseManager } from '../sse_manager.js';

export const distillRoutes: FastifyPluginAsync<{ container: Container }> = async (app, opts) => {
  const { container } = opts;

  // POST /api/distill
  app.post('/api/distill', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const operationId = nanoid();
    sseManager.createChannel(operationId);

    reply.code(202).send({ operationId });

    const useCase = new DistillSessionsUseCase(
      container.memoryRepository,
      container.sessionRepository
    );

    setImmediate(async () => {
      try {
        const result = await useCase.execute({
          dryRun: body.dryRun === true,
          limit: typeof body.limit === 'number' ? body.limit : undefined,
        });
        sseManager.complete(operationId, result);
      } catch (err) {
        sseManager.error(operationId, err instanceof Error ? err.message : String(err));
      }
    });
  });
};
