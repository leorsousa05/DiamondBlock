import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticServe from '@fastify/static';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { statusRoutes } from './routes/status.routes.js';
import { memoryRoutes } from './routes/memory.routes.js';
import { sessionRoutes } from './routes/session.routes.js';
import { indexRoutes } from './routes/index.routes.js';
import { distillRoutes } from './routes/distill.routes.js';
import { mcpInstallRoutes } from './routes/mcp_install.routes.js';
import { eventsRoutes } from './routes/events.routes.js';
import { fsRoutes } from './routes/fs.routes.js';
export async function createWebServer(container, options) {
    const app = Fastify({ logger: false });
    // Register CORS — localhost only
    await app.register(cors, {
        origin: [
            `http://localhost:${options.port}`,
            `http://127.0.0.1:${options.port}`,
        ],
    });
    // Register route plugins, passing container via options
    await app.register(statusRoutes, { container });
    await app.register(memoryRoutes, { container });
    await app.register(sessionRoutes, { container });
    await app.register(indexRoutes, { container });
    await app.register(distillRoutes, { container });
    await app.register(mcpInstallRoutes, { container });
    await app.register(eventsRoutes);
    await app.register(fsRoutes);
    // Serve static frontend files if the directory exists
    if (existsSync(options.staticDir)) {
        await app.register(staticServe, {
            root: options.staticDir,
            prefix: '/',
            // Don't throw on wildcard — we handle missing routes below
            wildcard: false,
        });
        // SPA fallback: serve index.html for all non-API requests
        app.setNotFoundHandler(async (req, reply) => {
            if (req.url.startsWith('/api/')) {
                return reply.code(404).send({ error: 'Not found' });
            }
            const indexHtml = join(options.staticDir, 'index.html');
            if (existsSync(indexHtml)) {
                return reply.sendFile('index.html', options.staticDir);
            }
            return reply.code(404).send({ error: 'Frontend not built' });
        });
    }
    else {
        // No static dir — only API routes; show a helpful message at root
        app.setNotFoundHandler(async (req, reply) => {
            if (req.url.startsWith('/api/')) {
                return reply.code(404).send({ error: 'Not found' });
            }
            return reply.code(200).type('text/html').send(`<!DOCTYPE html><html><body><h1>DiamondBlock API</h1>
<p>Web UI not built yet. Run <code>cd web && npm run build</code> first.</p>
<p><a href="/api/status">API Status</a></p></body></html>`);
        });
    }
    return app;
}
export async function startWebServer(container, options) {
    const app = await createWebServer(container, options);
    await app.listen({ port: options.port, host: options.host });
    const url = `http://${options.host === '127.0.0.1' || options.host === 'localhost' ? 'localhost' : options.host}:${options.port}`;
    console.log(`\n🚀  DiamondBlock Web UI running at ${url}\n`);
    if (options.open) {
        openBrowser(url);
    }
}
function openBrowser(url) {
    const platform = process.platform;
    let cmd;
    let args;
    if (platform === 'darwin') {
        cmd = 'open';
        args = [url];
    }
    else if (platform === 'win32') {
        cmd = 'cmd';
        args = ['/c', 'start', url];
    }
    else {
        cmd = 'xdg-open';
        args = [url];
    }
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}
//# sourceMappingURL=server.js.map