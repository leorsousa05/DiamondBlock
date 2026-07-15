import type { CodebaseChunk, CodebaseChunkListOptions, CodebaseChunkRepository } from '../application/ports/codebase_chunk_repository.js';
export interface FileCodebaseChunkRepositoryOptions {
    basePath: string;
}
export declare class FileCodebaseChunkRepository implements CodebaseChunkRepository {
    private readonly chunksDir;
    private readonly indexPath;
    constructor(options: FileCodebaseChunkRepositoryOptions);
    save(chunk: CodebaseChunk): Promise<void>;
    saveAll(chunks: CodebaseChunk[]): Promise<void>;
    findById(id: string): Promise<CodebaseChunk | null>;
    delete(id: string): Promise<void>;
    deleteAll(ids: string[]): Promise<void>;
    list(options: CodebaseChunkListOptions): Promise<CodebaseChunk[]>;
    purge(projectId: string): Promise<number>;
    private idToPath;
    private serialize;
    private deserialize;
    private loadIndex;
    private saveIndex;
    private updateIndexEntry;
    private removeIndexEntry;
    private rebuildIndex;
    private fallbackFindById;
    private fallbackDelete;
}
//# sourceMappingURL=file_codebase_chunk_repository.d.ts.map