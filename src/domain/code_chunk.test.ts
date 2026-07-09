import { describe, expect, it } from 'vitest';
import { createCodeChunk, codeChunkToMemory, memoryToCodeChunkTitle } from './code_chunk.js';

describe('createCodeChunk', () => {
  it('creates a chunk with deterministic id', () => {
    const input = {
      filePath: 'src/foo.ts',
      startLine: 1,
      endLine: 10,
      language: 'typescript',
      content: 'line1\nline2',
    };

    const a = createCodeChunk(input);
    const b = createCodeChunk(input);

    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^chunk_[a-z0-9]+$/);
    expect(a.filePath).toBe('src/foo.ts');
    expect(a.startLine).toBe(1);
    expect(a.endLine).toBe(10);
    expect(a.language).toBe('typescript');
  });

  it('produces different ids for different start lines', () => {
    const a = createCodeChunk({ filePath: 'src/foo.ts', startLine: 1, endLine: 10, language: 'ts', content: 'x' });
    const b = createCodeChunk({ filePath: 'src/foo.ts', startLine: 11, endLine: 20, language: 'ts', content: 'x' });

    expect(a.id).not.toBe(b.id);
  });

  it('produces different ids for different file paths', () => {
    const a = createCodeChunk({ filePath: 'src/foo.ts', startLine: 1, endLine: 10, language: 'ts', content: 'x' });
    const b = createCodeChunk({ filePath: 'src/bar.ts', startLine: 1, endLine: 10, language: 'ts', content: 'x' });

    expect(a.id).not.toBe(b.id);
  });
});

describe('codeChunkToMemory', () => {
  it('converts a chunk to a knowledge memory scoped to the project', () => {
    const chunk = createCodeChunk({
      filePath: 'src/services/auth.ts',
      startLine: 5,
      endLine: 15,
      language: 'typescript',
      content: '// file: src/services/auth.ts lines 5-15\nexport function login() {}',
    });

    const memory = codeChunkToMemory(chunk, 'my-project');

    expect(memory.type).toBe('knowledge');
    expect(memory.scope).toBe('project/my-project');
    expect(memory.source).toBe('codebase-indexer');
    expect(memory.tags).toEqual(['code', 'chunk', 'typescript']);
    expect(memory.confidence).toBe(1.0);
    expect(memory.title).toContain('file: src/services/auth.ts');
  });

  it('uses metadata confidence when available', () => {
    const chunk = createCodeChunk({
      filePath: 'src/services/auth.ts',
      startLine: 5,
      endLine: 15,
      language: 'typescript',
      content: '// file: src/services/auth.ts lines 5-15\nexport function login() {}',
      metadata: {
        parsingMode: 'ast',
        confidence: 0.75,
        supportsGraph: true,
        supportsSymbols: true,
        language: 'typescript',
        imports: [],
        symbolIds: [],
      },
    });

    const memory = codeChunkToMemory(chunk, 'my-project');

    expect(memory.confidence).toBe(0.75);
  });

  it('uses first line as title', () => {
    const chunk = createCodeChunk({
      filePath: 'src/foo.ts',
      startLine: 1,
      endLine: 2,
      language: 'typescript',
      content: 'export const FOO = 1;',
    });

    const memory = codeChunkToMemory(chunk, 'p');
    expect(memory.title).toBe('export const FOO = 1;');
  });
});

describe('memoryToCodeChunkTitle', () => {
  it('renders file path and line range', () => {
    const chunk = createCodeChunk({
      filePath: 'src/x.ts',
      startLine: 10,
      endLine: 20,
      language: 'ts',
      content: 'x',
    });

    expect(memoryToCodeChunkTitle(chunk)).toBe('// file: src/x.ts lines 10-20');
  });
});
