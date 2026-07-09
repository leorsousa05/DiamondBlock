import type { SourceFile } from './codebase_scanner.js';
import type { CodeChunkInput } from './code_chunker.js';
export type ParsingMode = 'ast' | 'simplified' | 'fallback';
export type SymbolKind = 'function' | 'class' | 'interface' | 'method' | 'component' | 'hook' | 'enum' | 'type' | 'variable' | 'unknown';
export interface CodeSymbol {
    id: string;
    name: string;
    kind: SymbolKind;
    startLine: number;
    endLine: number;
    signature?: string;
    documentation?: string;
}
export interface SymbolRelation {
    fromSymbolId: string;
    toSymbolId: string;
    type: 'calls' | 'imports' | 'extends' | 'implements' | 'references';
}
export interface ChunkMetadata {
    parsingMode: ParsingMode;
    confidence: number;
    supportsGraph: boolean;
    supportsSymbols: boolean;
    language: string;
    imports: string[];
    symbolIds: string[];
    parentSymbolId?: string;
    chunkType?: string;
}
export interface ParsingResult {
    language: string;
    parsingMode: ParsingMode;
    confidence: number;
    supportsGraph: boolean;
    supportsSymbols: boolean;
    symbols: CodeSymbol[];
    relations: SymbolRelation[];
    chunks: CodeChunkInput[];
}
export interface CodeParser {
    canParse(file: SourceFile): boolean;
    parse(file: SourceFile, content: string): Promise<ParsingResult>;
}
//# sourceMappingURL=code_parser.d.ts.map