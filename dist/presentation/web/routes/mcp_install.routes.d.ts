import type { FastifyPluginAsync } from 'fastify';
import type { Container } from '../../../container.js';
export interface McpTarget {
    name: string;
    label: string;
    configPath: string;
    detected: boolean;
}
export declare const mcpInstallRoutes: FastifyPluginAsync<{
    container: Container;
}>;
//# sourceMappingURL=mcp_install.routes.d.ts.map