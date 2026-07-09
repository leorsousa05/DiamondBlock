import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { ParsingResult } from '../application/ports/code_parser.js';
import type { SemanticChunkBuilder } from '../application/ports/semantic_chunk_builder.js';
export declare class SemanticChunkBuilderImpl implements SemanticChunkBuilder {
    build(file: SourceFile, result: ParsingResult): CodeChunkInput[];
    private buildChunk;
    private buildHeader;
    private stripExistingHeader;
}
//# sourceMappingURL=semantic_chunk_builder_impl.d.ts.map