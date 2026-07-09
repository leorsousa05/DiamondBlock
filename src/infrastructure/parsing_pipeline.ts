import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { ParsingResult } from '../application/ports/code_parser.js';
import type { ParserRegistry } from '../application/ports/parser_registry.js';
import type { SemanticChunkBuilder } from '../application/ports/semantic_chunk_builder.js';
import { SmartFallbackChunker } from './smart_fallback_chunker.js';

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'py':
      return 'python';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yml':
    case 'yaml':
      return 'yaml';
    default:
      return 'unknown';
  }
}

export interface ParsingPipelineOptions {
  registry: ParserRegistry;
  fallbackChunker: SmartFallbackChunker;
  semanticChunkBuilder: SemanticChunkBuilder;
}

export class ParsingPipeline {
  constructor(private readonly options: ParsingPipelineOptions) {}

  async process(file: SourceFile, content: string): Promise<ParsingResult> {
    const parser = this.options.registry.findParser(file);

    if (parser) {
      const result = await parser.parse(file, content);
      const chunks = this.options.semanticChunkBuilder.build(file, result);
      return { ...result, chunks };
    }

    const language = detectLanguage(file.relativePath);
    const fallbackChunks = this.options.fallbackChunker.chunk(file, content, { language });
    const fallbackResult = this.buildFallbackResult(file, content, fallbackChunks, language);
    const chunks = this.options.semanticChunkBuilder.build(file, fallbackResult);
    return { ...fallbackResult, chunks };
  }

  private buildFallbackResult(
    file: SourceFile,
    _content: string,
    fallbackChunks: CodeChunkInput[],
    language: string
  ): ParsingResult {
    return {
      language,
      parsingMode: 'fallback',
      confidence: 0.35,
      supportsGraph: false,
      supportsSymbols: false,
      symbols: [],
      relations: [],
      chunks: fallbackChunks,
    };
  }
}
