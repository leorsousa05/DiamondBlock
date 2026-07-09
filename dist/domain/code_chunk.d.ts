import type { MemoryInput } from './memory.js';
import type { ChunkMetadata } from '../application/ports/code_parser.js';
import type { CodebaseChunkInput } from '../application/ports/codebase_chunk_repository.js';
export interface CodeChunk {
    id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
    metadata?: ChunkMetadata;
}
export interface CodeChunkInput {
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
    metadata?: ChunkMetadata;
}
export declare function createCodeChunk(input: CodeChunkInput): CodeChunk;
export declare function codeChunkToMemory(chunk: CodeChunk, projectId: string): MemoryInput;
export declare function memoryToCodeChunkTitle(chunk: CodeChunk): string;
export declare function createCodebaseChunkFromCodeChunk(chunk: CodeChunk, projectId: string): CodebaseChunkInput;
//# sourceMappingURL=code_chunk.d.ts.map