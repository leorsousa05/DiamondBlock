export const sessionRoutes = async (app, opts) => {
    const { container } = opts;
    const { sessionRepository } = container;
    // GET /api/sessions
    app.get('/api/sessions', async (req, reply) => {
        const query = req.query;
        const limit = parseInt(query.limit ?? '20', 10);
        const project = query.project;
        const sessions = await sessionRepository.listRecent(limit, project);
        // Return sessions without messages for the list view
        const sessionSummaries = sessions.map(({ messages: _messages, ...rest }) => rest);
        return reply.send(sessionSummaries);
    });
    // GET /api/sessions/:id
    app.get('/api/sessions/:id', async (req, reply) => {
        const { id } = req.params;
        const session = await sessionRepository.findById(id);
        if (!session) {
            return reply.code(404).send({ error: 'Session not found' });
        }
        return reply.send(session);
    });
};
//# sourceMappingURL=session.routes.js.map