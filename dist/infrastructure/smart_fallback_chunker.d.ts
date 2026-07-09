import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
export interface SmartFallbackChunkerOptions {
    maxChunkLines?: number;
    overlapLines?: number;
    language?: string;
}
export declare class SmartFallbackChunker {
    private readonly maxChunkLines;
    private readonly overlapLines;
    constructor(options?: SmartFallbackChunkerOptions);
    chunk(file: SourceFile, content: string, options?: SmartFallbackChunkerOptions): CodeChunkInput[];
    private findNaturalDelimiters;
    private isBlank;
    private isRegionMarker;
    private isMarkdownHeading;
    private isConfigSection;
    private findNextNonBlank;
    private splitByDelimiters;
    private splitBySize;
    private splitBySizeFrom;
    private buildChunk;
}
//# sourceMappingURL=smart_fallback_chunker.d.ts.map