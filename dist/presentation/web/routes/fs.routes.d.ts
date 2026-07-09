import type { FastifyPluginAsync } from 'fastify';
export interface FileSystemBrowseResult {
    currentPath: string;
    parentPath: string | null;
    directories: string[];
    files: string[];
}
export declare const fsRoutes: FastifyPluginAsync;
//# sourceMappingURL=fs.routes.d.ts.map