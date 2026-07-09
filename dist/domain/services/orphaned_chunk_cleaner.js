export class OrphanedChunkCleaner {
    options;
    constructor(options) {
        this.options = options;
    }
    async clean(projectId) {
        const manifest = await this.options.codebaseIndexRepository.load(projectId);
        if (!manifest) {
            return { projectId, chunkIdsRemoved: 0 };
        }
        const referencedIds = new Set();
        for (const entry of Object.values(manifest.files)) {
            for (const chunkId of entry.chunkIds) {
                referencedIds.add(chunkId);
            }
        }
        const allChunks = await this.options.codebaseChunkRepository.list({ projectId, limit: 100000 });
        const orphaned = allChunks.filter((chunk) => !referencedIds.has(chunk.id));
        for (const chunk of orphaned) {
            await this.options.codebaseChunkRepository.delete(chunk.id);
            try {
                await this.options.vectorIndex.remove(chunk.id);
            }
            catch {
                // Ignore vector removal errors; the chunk is already gone.
            }
        }
        return { projectId, chunkIdsRemoved: orphaned.length };
    }
}
//# sourceMappingURL=orphaned_chunk_cleaner.js.map