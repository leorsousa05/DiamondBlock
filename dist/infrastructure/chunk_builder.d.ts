import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { CodeSymbol, SymbolKind } from '../application/ports/code_parser.js';
export interface BuildChunkOptions {
    file: SourceFile;
    lines: string[];
    symbol: CodeSymbol;
    language: string;
    imports: string[];
    parsingMode: 'ast' | 'simplified' | 'fallback';
    confidence: number;
    supportsGraph: boolean;
    supportsSymbols: boolean;
}
export declare function buildChunk(options: BuildChunkOptions): CodeChunkInput;
export declare function buildChunks(options: Omit<BuildChunkOptions, 'symbol'> & {
    symbols: CodeSymbol[];
}): CodeChunkInput[];
export declare function buildSignature(line: string | undefined, name: string, kind: SymbolKind): string | undefined;
export declare function buildSymbolId(filePath: string, name: string, startLine: number): string;
//# sourceMappingURL=chunk_builder.d.ts.map