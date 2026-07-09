import type { SourceFile } from './codebase_scanner.js';
import type { ChunkMetadata } from './code_parser.js';
export interface CodeChunkerOptions {
    chunkSizeLines?: number;
    overlapLines?: number;
}
export interface CodeChunkInput {
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    content: string;
    metadata?: ChunkMetadata;
}
export interface CodeChunker {
    chunk(file: SourceFile, content: string, options?: CodeChunkerOptions): Promise<CodeChunkInput[]>;
}
//# sourceMappingURL=code_chunker.d.ts.map