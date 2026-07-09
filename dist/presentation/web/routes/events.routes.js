import { sseManager } from '../sse_manager.js';
export const eventsRoutes = async (app) => {
    // GET /api/events/:operationId
    app.get('/api/events/:operationId', async (req, reply) => {
        const { operationId } = req.params;
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('X-Accel-Buffering', 'no');
        reply.raw.flushHeaders();
        sseManager.subscribe(operationId, reply);
        // Keep connection open; clean up when client disconnects
        req.raw.on('close', () => {
            // The sseManager will handle cleanup when it completes/errors.
            // This just suppresses any write errors on the closed socket.
        });
        // Return a promise that never resolves so Fastify keeps the connection open
        return new Promise(() => {
            // Intentionally never resolved — connection is kept alive until SSE channel closes
        });
    });
};
//# sourceMappingURL=events.routes.js.map