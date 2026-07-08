import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMemory } from '../domain/memory.js';
import { memoryToMarkdown } from './markdown_serializer.js';
export async function initializeVault(options) {
    const { vaultPath } = options;
    await mkdir(join(vaultPath, 'vault', 'Memory', 'user'), { recursive: true });
    await mkdir(join(vaultPath, 'vault', 'Memory', 'project'), { recursive: true });
    await mkdir(join(vaultPath, 'vault', 'Knowledge'), { recursive: true });
    await mkdir(join(vaultPath, 'vault', 'Sessions'), { recursive: true });
    await mkdir(join(vaultPath, 'vault', 'Journal'), { recursive: true });
    await mkdir(join(vaultPath, 'index'), { recursive: true });
    const defaultConfig = {
        vaultPath,
        embeddingProvider: 'local',
        heartbeatIntervalMinutes: 60,
        contextWindowTokens: 8000,
    };
    await writeFile(join(vaultPath, '.diamondblock.yml'), `vaultPath: ${vaultPath}\nembeddingProvider: local\nheartbeatIntervalMinutes: 60\ncontextWindowTokens: 8000\n`, 'utf-8');
    if (options.createSample) {
        const userMemory = createMemory({
            type: 'user',
            scope: 'user',
            title: 'User Preferences',
            content: 'Default user preferences. Update this file with your personal rules and style.',
            source: 'init',
            tags: ['preferences'],
        });
        await writeFile(join(vaultPath, 'vault', 'Memory', 'user', `${userMemory.id}.md`), memoryToMarkdown(userMemory), 'utf-8');
    }
}
export function defaultVaultPath() {
    return process.env.DB_HOME ?? join(process.env.HOME ?? '/tmp', '.diamondblock');
}
//# sourceMappingURL=vault_initializer.js.map