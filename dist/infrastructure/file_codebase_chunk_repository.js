import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { isNotFoundError, walkDirectory } from './file_system.js';
export class FileCodebaseChunkRepository {
    chunksDir;
    indexPath;
    constructor(options) {
        this.chunksDir = join(options.basePath, 'vault', 'CodebaseChunks');
        this.indexPath = join(this.chunksDir, 'chunk-index.json');
    }
    async save(chunk) {
        const path = this.idToPath(chunk.id, chunk.projectId);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, JSON.stringify(this.serialize(chunk), null, 2), 'utf-8');
        await this.updateIndexEntry(chunk.id, chunk.projectId);
    }
    async saveAll(chunks) {
        if (chunks.length === 0)
            return;
        for (const chunk of chunks) {
            const path = this.idToPath(chunk.id, chunk.projectId);
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, JSON.stringify(this.serialize(chunk), null, 2), 'utf-8');
        }
        const index = await this.loadIndex();
        for (const chunk of chunks) {
            index[chunk.id] = chunk.projectId;
        }
        await this.saveIndex(index);
    }
    async findById(id) {
        const index = await this.loadIndex();
        const projectId = index[id];
        if (projectId) {
            const path = this.idToPath(id, projectId);
            try {
                const raw = await readFile(path, 'utf-8');
                return this.deserialize(raw);
            }
            catch (error) {
                if (isNotFoundError(error)) {
                    await this.removeIndexEntry(id);
                    return this.fallbackFindById(id);
                }
                throw error;
            }
        }
        return this.fallbackFindById(id);
    }
    async delete(id) {
        const index = await this.loadIndex();
        const projectId = index[id];
        if (projectId) {
            const path = this.idToPath(id, projectId);
            try {
                await rm(path, { force: true });
            }
            catch {
                // ignore
            }
            await this.removeIndexEntry(id);
            return;
        }
        await this.fallbackDelete(id);
    }
    async list(options) {
        const projectDir = join(this.chunksDir, options.projectId);
        const files = await walkDirectory(projectDir);
        const chunks = [];
        for (const file of files) {
            if (!file.endsWith('.json'))
                continue;
            const raw = await readFile(file, 'utf-8');
            chunks.push(this.deserialize(raw));
        }
        chunks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const offset = options.offset ?? 0;
        const limit = options.limit ?? 50;
        return chunks.slice(offset, offset + limit);
    }
    async purge(projectId) {
        const projectDir = join(this.chunksDir, projectId);
        const files = await walkDirectory(projectDir);
        const toDelete = files.filter((file) => file.endsWith('.json'));
        await Promise.all(toDelete.map((file) => rm(file, { force: true })));
        await this.rebuildIndex();
        return toDelete.length;
    }
    idToPath(id, projectId) {
        return join(this.chunksDir, projectId, `${id}.json`);
    }
    serialize(chunk) {
        return {
            ...chunk,
            metadata: chunk.metadata,
            createdAt: chunk.createdAt.toISOString(),
            updatedAt: chunk.updatedAt.toISOString(),
        };
    }
    deserialize(raw) {
        const parsed = JSON.parse(raw);
        return {
            ...parsed,
            createdAt: new Date(parsed.createdAt),
            updatedAt: new Date(parsed.updatedAt),
        };
    }
    async loadIndex() {
        try {
            const raw = await readFile(this.indexPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch (error) {
            if (isNotFoundError(error))
                return {};
            throw error;
        }
    }
    async saveIndex(index) {
        await mkdir(this.chunksDir, { recursive: true });
        await writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
    }
    async updateIndexEntry(chunkId, projectId) {
        const index = await this.loadIndex();
        index[chunkId] = projectId;
        await this.saveIndex(index);
    }
    async removeIndexEntry(chunkId) {
        const index = await this.loadIndex();
        delete index[chunkId];
        await this.saveIndex(index);
    }
    async rebuildIndex() {
        const index = {};
        try {
            const projectDirs = await readdir(this.chunksDir, { withFileTypes: true });
            for (const entry of projectDirs) {
                if (!entry.isDirectory())
                    continue;
                const projectId = entry.name;
                const files = await walkDirectory(join(this.chunksDir, projectId));
                for (const file of files) {
                    if (!file.endsWith('.json'))
                        continue;
                    const id = basename(file, '.json');
                    index[id] = projectId;
                }
            }
        }
        catch {
            // ignore empty or missing directory
        }
        await this.saveIndex(index);
    }
    async fallbackFindById(id) {
        const files = await walkDirectory(this.chunksDir);
        const match = files.find((file) => basename(file) === `${id}.json`);
        if (!match)
            return null;
        await this.rebuildIndex();
        const raw = await readFile(match, 'utf-8');
        return this.deserialize(raw);
    }
    async fallbackDelete(id) {
        const files = await walkDirectory(this.chunksDir);
        const match = files.find((file) => basename(file) === `${id}.json`);
        if (match) {
            await rm(match, { force: true });
        }
        await this.rebuildIndex();
    }
}
//# sourceMappingURL=file_codebase_chunk_repository.js.map