import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createCodeChunk, codeChunkToMemory } from '../domain/code_chunk.js';
import { createMemory } from '../domain/memory.js';
import { createEmptyManifest, createFileIndexEntry } from './file_codebase_index_repository.js';
export class CodebaseIndexer {
    options;
    constructor(options) {
        this.options = options;
    }
    async index(projectId, rootPath, options = {}) {
        const progress = options.progress;
        progress?.onScanStart?.();
        const files = await this.options.scanner.scan({ rootPath });
        progress?.onScanComplete?.(files);
        const previousManifest = (await this.options.indexRepository.load(projectId)) ?? createEmptyManifest(projectId, rootPath);
        const previousFiles = previousManifest.files;
        const currentHashes = await this.computeHashes(files);
        const added = [];
        const updated = [];
        const unchanged = [];
        const currentRelativePaths = new Set(files.map((f) => f.relativePath));
        for (const file of files) {
            const hash = currentHashes.get(file.relativePath);
            if (!hash)
                continue;
            const previous = previousFiles[file.relativePath];
            if (!previous) {
                added.push(file);
            }
            else if (previous.contentHash !== hash || options.force) {
                updated.push(file);
            }
            else {
                unchanged.push(file);
            }
        }
        const removed = Object.keys(previousFiles).filter((path) => !currentRelativePaths.has(path));
        if (options.dryRun) {
            return { added, updated, removed, unchanged, chunksCreated: 0, chunksRemoved: 0 };
        }
        const manifest = createEmptyManifest(projectId, rootPath);
        manifest.createdAt = previousManifest.createdAt;
        let chunksCreated = 0;
        let chunksRemoved = 0;
        for (const file of unchanged) {
            const previous = previousFiles[file.relativePath];
            if (previous) {
                manifest.files[file.relativePath] = previous;
            }
        }
        const filesToIndex = [...added, ...updated];
        for (let i = 0; i < filesToIndex.length; i++) {
            const file = filesToIndex[i];
            progress?.onFileStart?.(file, i + 1, filesToIndex.length);
            const memoryIds = await this.indexFile(projectId, file);
            progress?.onFileComplete?.(file, memoryIds.length, i + 1, filesToIndex.length);
            chunksCreated += memoryIds.length;
            const hash = currentHashes.get(file.relativePath);
            manifest.files[file.relativePath] = createFileIndexEntry(file.relativePath, hash, memoryIds);
        }
        progress?.onSavingStart?.();
        for (const relativePath of removed) {
            const entry = previousFiles[relativePath];
            if (entry) {
                chunksRemoved += entry.memoryIds.length;
                await this.removeMemories(entry.memoryIds);
            }
        }
        await this.options.indexRepository.save(manifest);
        progress?.onSavingComplete?.();
        return { added, updated, removed, unchanged, chunksCreated, chunksRemoved };
    }
    async computeHashes(files) {
        const hashes = new Map();
        await Promise.all(files.map(async (file) => {
            const content = await readFile(file.absolutePath, 'utf-8');
            const hash = createHash('sha256').update(content).digest('hex');
            hashes.set(file.relativePath, hash);
        }));
        return hashes;
    }
    async indexFile(projectId, file) {
        const content = await readFile(file.absolutePath, 'utf-8');
        const chunkInputs = await this.options.chunker.chunk(file, content);
        const chunks = chunkInputs.map((input) => createCodeChunk(input));
        const memoryIds = [];
        for (const chunk of chunks) {
            const memoryInput = codeChunkToMemory(chunk, projectId);
            const memory = createMemory(memoryInput, chunk.id);
            await this.options.memoryRepository.save(memory);
            memoryIds.push(memory.id);
            if (await this.options.embeddingProvider.isAvailable()) {
                try {
                    const text = `${memory.title}\n${memory.content}`;
                    const embedding = await this.options.embeddingProvider.embed(text);
                    await this.options.vectorIndex.index(memory, embedding);
                }
                catch (error) {
                    console.warn(`Failed to embed chunk ${memory.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        return memoryIds;
    }
    async removeMemories(memoryIds) {
        await Promise.all(memoryIds.map(async (id) => {
            try {
                await this.options.memoryRepository.delete(id);
            }
            catch (error) {
                console.warn(`Failed to delete memory ${id}: ${error instanceof Error ? error.message : String(error)}`);
            }
            try {
                await this.options.vectorIndex.remove(id);
            }
            catch (error) {
                console.warn(`Failed to remove vector ${id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }));
    }
}
//# sourceMappingURL=codebase_indexer.js.map