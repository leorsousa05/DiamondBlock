import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { ParsingResult, ChunkMetadata } from '../application/ports/code_parser.js';
import type { SemanticChunkBuilder } from '../application/ports/semantic_chunk_builder.js';

export class SemanticChunkBuilderImpl implements SemanticChunkBuilder {
  build(file: SourceFile, result: ParsingResult): CodeChunkInput[] {
    return result.chunks.map((chunk) => this.buildChunk(file, result, chunk));
  }

  private buildChunk(
    file: SourceFile,
    result: ParsingResult,
    chunk: CodeChunkInput
  ): CodeChunkInput {
    const metadata: ChunkMetadata = chunk.metadata ?? {
      parsingMode: result.parsingMode,
      confidence: result.confidence,
      supportsGraph: result.supportsGraph,
      supportsSymbols: result.supportsSymbols,
      language: result.language,
      imports: [],
      symbolIds: [],
    };

    const header = this.buildHeader(file, chunk, metadata);
    const body = this.stripExistingHeader(chunk.content);
    const importBlock = metadata.imports.length > 0 ? `${metadata.imports.join('\n')}\n\n` : '';
    const content = `${header}\n${importBlock}${body}`;

    return {
      filePath: chunk.filePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      language: chunk.language,
      content,
      metadata,
    };
  }

  private buildHeader(file: SourceFile, chunk: CodeChunkInput, metadata: ChunkMetadata): string {
    const symbolHint = metadata.symbolIds.length > 0 ? ` symbols: ${metadata.symbolIds.join(', ')}` : '';
    return `// file: ${file.relativePath} lines ${chunk.startLine}-${chunk.endLine}${symbolHint}`;
  }

  private stripExistingHeader(content: string): string {
    return content;
  }
}
