import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export class FileCodebaseIndexRepository {
    indexDir;
    constructor(options) {
        this.indexDir = join(options.basePath, 'vault', 'CodebaseIndex');
    }
    async load(projectId) {
        const path = this.manifestPath(projectId);
        try {
            const raw = await readFile(path, 'utf-8');
            const parsed = JSON.parse(raw);
            return {
                ...parsed,
                files: parsed.files ?? {},
            };
        }
        catch (error) {
            if (this.isNotFoundError(error))
                return null;
            throw error;
        }
    }
    async save(manifest) {
        const path = this.manifestPath(manifest.projectId);
        await mkdir(path.split('/').slice(0, -1).join('/'), { recursive: true });
        await writeFile(path, JSON.stringify(manifest, null, 2), 'utf-8');
    }
    async delete(projectId) {
        const path = this.manifestPath(projectId);
        await rm(path, { force: true });
    }
    manifestPath(projectId) {
        return join(this.indexDir, `${projectId}.json`);
    }
    isNotFoundError(error) {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
    }
}
export function createEmptyManifest(projectId, rootPath) {
    const now = new Date().toISOString();
    return {
        projectId,
        rootPath,
        createdAt: now,
        updatedAt: now,
        files: {},
    };
}
export function createFileIndexEntry(relativePath, contentHash, memoryIds) {
    return {
        relativePath,
        contentHash,
        indexedAt: new Date().toISOString(),
        memoryIds,
    };
}
//# sourceMappingURL=file_codebase_index_repository.js.map