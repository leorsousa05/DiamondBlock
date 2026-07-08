import type { Memory } from '../domain/memory.js';
import type { ListOptions, MemoryRepository, SearchOptions } from '../application/ports/memory_repository.js';
export interface FileMemoryRepositoryOptions {
    basePath: string;
}
export declare class FileMemoryRepository implements MemoryRepository {
    private readonly memoryDir;
    constructor(options: FileMemoryRepositoryOptions);
    findById(id: string): Promise<Memory | null>;
    search(options: SearchOptions): Promise<Memory[]>;
    searchWithScore(options: SearchOptions): Promise<Array<{
        memory: Memory;
        score: number;
    }>>;
    save(memory: Memory): Promise<void>;
    delete(id: string): Promise<void>;
    list(options?: ListOptions): Promise<Memory[]>;
    resolvePath(memory: Memory): string;
    private idToPath;
    private listAll;
    private findExistingPath;
}
//# sourceMappingURL=file_memory_repository.d.ts.map