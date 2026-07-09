import type { SourceFile } from './codebase_scanner.js';
import type { CodeChunkInput } from './code_chunker.js';
import type { ParsingResult } from './code_parser.js';

export interface SemanticChunkBuilder {
  build(file: SourceFile, result: ParsingResult): CodeChunkInput[];
}
