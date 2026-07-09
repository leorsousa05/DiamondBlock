import { describe, expect, it } from 'vitest';
import { ParsingPipeline } from './parsing_pipeline.js';
import { ParserRegistryImpl } from './parser_registry_impl.js';
import { SemanticChunkBuilderImpl } from './semantic_chunk_builder_impl.js';
import { SmartFallbackChunker } from './smart_fallback_chunker.js';
import { TypeScriptParser } from './typescript_parser.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult } from '../application/ports/code_parser.js';

class FakeParser implements CodeParser {
  canParse(file: SourceFile): boolean {
    return file.relativePath.endsWith('.py');
  }

  async parse(file: SourceFile, content: string): Promise<ParsingResult> {
    return {
      language: 'python',
      parsingMode: 'ast',
      confidence: 0.95,
      supportsGraph: true,
      supportsSymbols: true,
      symbols: [],
      relations: [],
      chunks: [
        {
          filePath: file.relativePath,
          startLine: 1,
          endLine: content.split('\n').length,
          language: 'python',
          content,
        },
      ],
    };
  }
}

describe('ParsingPipeline', () => {
  const registry = new ParserRegistryImpl();
  registry.register('typescript', new TypeScriptParser());
  registry.register('python', new FakeParser());

  const pipeline = new ParsingPipeline({
    registry,
    fallbackChunker: new SmartFallbackChunker(),
    semanticChunkBuilder: new SemanticChunkBuilderImpl(),
  });

  it('uses AST parser when available for TypeScript files', async () => {
    const file: SourceFile = { absolutePath: '/tmp/app.ts', relativePath: 'src/app.ts' };
    const content = 'export function add(a: number, b: number): number {\n  return a + b;\n}';

    const result = await pipeline.process(file, content);

    expect(result.parsingMode).toBe('ast');
    expect(result.confidence).toBe(0.95);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toContain('function add');
    expect(result.chunks[0].metadata?.parsingMode).toBe('ast');
  });

  it('falls back to smart chunker for unsupported files', async () => {
    const file: SourceFile = { absolutePath: '/tmp/config.yaml', relativePath: 'config.yaml' };
    const content = 'key1: value1\n\nkey2: value2\n\nkey3: value3';

    const result = await pipeline.process(file, content);

    expect(result.parsingMode).toBe('fallback');
    expect(result.confidence).toBe(0.35);
    expect(result.chunks.length).toBeGreaterThanOrEqual(2);
    expect(result.chunks[0].metadata?.parsingMode).toBe('fallback');
  });

  it('propagates metadata through semantic chunk builder', async () => {
    const file: SourceFile = { absolutePath: '/tmp/app.ts', relativePath: 'src/app.ts' };
    const content = "import React from 'react';\n\nexport function App() {\n  return <div />;\n}";

    const result = await pipeline.process(file, content);

    const appChunk = result.chunks.find((c) => c.content.includes('function App'));
    expect(appChunk).toBeDefined();
    expect(appChunk?.metadata?.parsingMode).toBe('ast');
    expect(appChunk?.metadata?.supportsSymbols).toBe(true);
  });

  it('uses registered fake parser for Python files', async () => {
    const file: SourceFile = { absolutePath: '/tmp/app.py', relativePath: 'src/app.py' };
    const content = 'def hello():\n    return "world"';

    const result = await pipeline.process(file, content);

    expect(result.parsingMode).toBe('ast');
    expect(result.language).toBe('python');
  });
});
