import Fastify from 'fastify';
import type { Container } from '../../container.js';
export interface WebServerOptions {
    port: number;
    host: string;
    staticDir: string;
    open?: boolean;
}
export declare function createWebServer(container: Container, options: WebServerOptions): Promise<Fastify.FastifyInstance<import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, Fastify.FastifyBaseLogger, Fastify.FastifyTypeProviderDefault>>;
export declare function startWebServer(container: Container, options: WebServerOptions): Promise<void>;
//# sourceMappingURL=server.d.ts.map