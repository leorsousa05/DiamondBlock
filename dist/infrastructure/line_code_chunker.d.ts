import type { CodeChunker, CodeChunkerOptions, CodeChunkInput } from '../application/ports/code_chunker.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
export declare class LineCodeChunker implements CodeChunker {
    chunk(file: SourceFile, content: string, options?: CodeChunkerOptions): Promise<CodeChunkInput[]>;
}
//# sourceMappingURL=line_code_chunker.d.ts.map