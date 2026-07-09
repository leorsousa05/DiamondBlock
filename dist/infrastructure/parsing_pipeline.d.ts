import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { ParsingResult } from '../application/ports/code_parser.js';
import type { ParserRegistry } from '../application/ports/parser_registry.js';
import type { SemanticChunkBuilder } from '../application/ports/semantic_chunk_builder.js';
import { SmartFallbackChunker } from './smart_fallback_chunker.js';
export interface ParsingPipelineOptions {
    registry: ParserRegistry;
    fallbackChunker: SmartFallbackChunker;
    semanticChunkBuilder: SemanticChunkBuilder;
}
export declare class ParsingPipeline {
    private readonly options;
    constructor(options: ParsingPipelineOptions);
    process(file: SourceFile, content: string): Promise<ParsingResult>;
    private buildFallbackResult;
}
//# sourceMappingURL=parsing_pipeline.d.ts.map