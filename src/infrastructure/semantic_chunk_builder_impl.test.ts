import { describe, expect, it } from 'vitest';
import { SemanticChunkBuilderImpl } from './semantic_chunk_builder_impl.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { ParsingResult } from '../application/ports/code_parser.js';

describe('SemanticChunkBuilderImpl', () => {
  const file: SourceFile = { absolutePath: '/tmp/app.ts', relativePath: 'src/app.ts' };
  const builder = new SemanticChunkBuilderImpl();

  function makeResult(chunks: CodeChunkInput[]): ParsingResult {
    return {
      language: 'typescript',
      parsingMode: 'ast',
      confidence: 0.95,
      supportsGraph: true,
      supportsSymbols: true,
      symbols: [],
      relations: [],
      chunks,
    };
  }

  it('prepends standardized header with file path and line range', () => {
    const result = makeResult([
      {
        filePath: file.relativePath,
        startLine: 1,
        endLine: 5,
        language: 'typescript',
        content: 'function add(a: number, b: number): number {\n  return a + b;\n}',
        metadata: {
          parsingMode: 'ast',
          confidence: 0.95,
          supportsGraph: true,
          supportsSymbols: true,
          language: 'typescript',
          imports: ["import React from 'react';"],
          symbolIds: ['sym_abc123'],
        },
      },
    ]);

    const chunks = builder.build(file, result);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('// file: src/app.ts lines 1-5 symbols: sym_abc123');
    expect(chunks[0].content).toContain("import React from 'react';");
    expect(chunks[0].content).toContain('function add');

    const headerMatches = chunks[0].content.match(/\/\/ file:/g);
    expect(headerMatches).toHaveLength(1);
  });

  it('creates fallback metadata when chunk metadata is missing', () => {
    const result = makeResult([
      {
        filePath: file.relativePath,
        startLine: 1,
        endLine: 3,
        language: 'typescript',
        content: 'function add() {}',
      },
    ]);

    const chunks = builder.build(file, result);

    expect(chunks[0].metadata).toEqual({
      parsingMode: 'ast',
      confidence: 0.95,
      supportsGraph: true,
      supportsSymbols: true,
      language: 'typescript',
      imports: [],
      symbolIds: [],
    });
  });

  it('preserves chunk file path and line numbers', () => {
    const result = makeResult([
      {
        filePath: file.relativePath,
        startLine: 5,
        endLine: 15,
        language: 'typescript',
        content: 'class User {}',
      },
    ]);

    const chunks = builder.build(file, result);

    expect(chunks[0].filePath).toBe('src/app.ts');
    expect(chunks[0].startLine).toBe(5);
    expect(chunks[0].endLine).toBe(15);
  });
});
