import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'package.json');
export const statusRoutes = async (app, opts) => {
    const { container } = opts;
    app.get('/api/status', async (_req, reply) => {
        const [packageJson, config, memories, sessions] = await Promise.all([
            readFile(packageJsonPath, 'utf-8').then((raw) => JSON.parse(raw)),
            container.configStore.load(),
            container.memoryRepository.list({ limit: 100000 }),
            container.sessionRepository.listRecent(100000),
        ]);
        return reply.send({
            vaultPath: config.vaultPath ?? '',
            embeddingProvider: config.embeddingProvider ?? 'local',
            memoryCount: memories.length,
            sessionCount: sessions.length,
            version: packageJson.version,
        });
    });
};
//# sourceMappingURL=status.routes.js.map