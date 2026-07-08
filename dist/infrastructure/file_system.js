import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
export function isNotFoundError(error) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
export async function walkDirectory(dir) {
    try {
        const entries = await readdir(dir, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...(await walkDirectory(path)));
            }
            else {
                files.push(path);
            }
        }
        return files;
    }
    catch (error) {
        if (isNotFoundError(error))
            return [];
        throw error;
    }
}
//# sourceMappingURL=file_system.js.map