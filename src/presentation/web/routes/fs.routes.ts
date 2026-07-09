import { readdir, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';

export interface FileSystemBrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: string[];
  files: string[];
}

export const fsRoutes: FastifyPluginAsync = async (app, _opts) => {
  app.get('/api/fs/browse', async (req, reply) => {
    const query = req.query as { path?: string };
    const rawPath = query.path || process.cwd();

    try {
      const resolvedPath = resolve(rawPath);
      const parent = dirname(resolvedPath);
      // If we are at root, parent is the same. Avoid loops.
      const parentPath = parent === resolvedPath ? null : parent;

      const entries = await readdir(resolvedPath, { withFileTypes: true });

      const directories: string[] = [];
      const files: string[] = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // ignore hidden items

        if (entry.isDirectory()) {
          directories.push(entry.name);
        } else if (entry.isFile()) {
          files.push(entry.name);
        }
      }

      // Sort alphabetically
      directories.sort();
      files.sort();

      const result: FileSystemBrowseResult = {
        currentPath: resolvedPath,
        parentPath,
        directories,
        files,
      };

      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({ error: `Cannot read directory: ${message}` });
    }
  });
};
