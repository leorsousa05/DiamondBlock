import { readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
export const fsRoutes = async (app, _opts) => {
    app.get('/api/fs/browse', async (req, reply) => {
        const query = req.query;
        const rawPath = query.path || process.cwd();
        try {
            const resolvedPath = resolve(rawPath);
            const parent = dirname(resolvedPath);
            // If we are at root, parent is the same. Avoid loops.
            const parentPath = parent === resolvedPath ? null : parent;
            const entries = await readdir(resolvedPath, { withFileTypes: true });
            const directories = [];
            const files = [];
            for (const entry of entries) {
                if (entry.name.startsWith('.'))
                    continue; // ignore hidden items
                if (entry.isDirectory()) {
                    directories.push(entry.name);
                }
                else if (entry.isFile()) {
                    files.push(entry.name);
                }
            }
            // Sort alphabetically
            directories.sort();
            files.sort();
            const result = {
                currentPath: resolvedPath,
                parentPath,
                directories,
                files,
            };
            return reply.send(result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return reply.code(400).send({ error: `Cannot read directory: ${message}` });
        }
    });
};
//# sourceMappingURL=fs.routes.js.map