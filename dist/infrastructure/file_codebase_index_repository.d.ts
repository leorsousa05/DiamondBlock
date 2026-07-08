import type { CodebaseIndexManifest, CodebaseIndexRepository, FileIndexEntry } from '../application/ports/codebase_index_repository.js';
export interface FileCodebaseIndexRepositoryOptions {
    basePath: string;
}
export declare class FileCodebaseIndexRepository implements CodebaseIndexRepository {
    private readonly indexDir;
    constructor(options: FileCodebaseIndexRepositoryOptions);
    load(projectId: string): Promise<CodebaseIndexManifest | null>;
    save(manifest: CodebaseIndexManifest): Promise<void>;
    delete(projectId: string): Promise<void>;
    private manifestPath;
    private isNotFoundError;
}
export declare function createEmptyManifest(projectId: string, rootPath: string): CodebaseIndexManifest;
export declare function createFileIndexEntry(relativePath: string, contentHash: string, memoryIds: string[]): FileIndexEntry;
//# sourceMappingURL=file_codebase_index_repository.d.ts.map