import type { FastifyPluginAsync } from 'fastify';
import type { Container } from '../../../container.js';
import type { Session } from '../../../domain/session.js';

export const sessionRoutes: FastifyPluginAsync<{ container: Container }> = async (app, opts) => {
  const { container } = opts;
  const { sessionRepository } = container;

  // GET /api/sessions
  app.get('/api/sessions', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const limit = parseInt(query.limit ?? '20', 10);
    const project = query.project;

    const sessions = await sessionRepository.listRecent(limit, project);

    // Return sessions without messages for the list view
    const sessionSummaries = sessions.map(({ messages: _messages, ...rest }) => rest);
    return reply.send(sessionSummaries);
  });

  // GET /api/sessions/:id
  app.get('/api/sessions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await sessionRepository.findById(id);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }
    return reply.send(session);
  });
};
