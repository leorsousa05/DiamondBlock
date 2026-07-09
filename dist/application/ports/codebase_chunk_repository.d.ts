import type { ChunkMetadata } from './code_parser.js';
export interface CodebaseChunk {
    id: string;
    projectId: string;
    scope: string;
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
    title: string;
    source: string;
    tags: string[];
    confidence: number;
    metadata?: ChunkMetadata;
    createdAt: Date;
    updatedAt: Date;
}
export interface CodebaseChunkInput {
    id: string;
    projectId: string;
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
    title: string;
    source?: string;
    tags?: string[];
    confidence?: number;
    metadata?: ChunkMetadata;
}
export interface CodebaseChunkListOptions {
    projectId: string;
    limit?: number;
    offset?: number;
}
export interface CodebaseChunkRepository {
    save(chunk: CodebaseChunk): Promise<void>;
    findById(id: string): Promise<CodebaseChunk | null>;
    delete(id: string): Promise<void>;
    list(options: CodebaseChunkListOptions): Promise<CodebaseChunk[]>;
    purge(projectId: string): Promise<number>;
}
//# sourceMappingURL=codebase_chunk_repository.d.ts.map