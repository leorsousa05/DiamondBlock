import type { MemoryInput } from './memory.js';
export interface CodeChunk {
    id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
}
export interface CodeChunkInput {
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
}
export declare function createCodeChunk(input: CodeChunkInput): CodeChunk;
export declare function codeChunkToMemory(chunk: CodeChunk, projectId: string): MemoryInput;
export declare function memoryToCodeChunkTitle(chunk: CodeChunk): string;
//# sourceMappingURL=code_chunk.d.ts.map