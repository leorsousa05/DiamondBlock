import { describe, expect, it } from 'vitest';
import { LineCodeChunker } from './line_code_chunker.js';

describe('LineCodeChunker', () => {
  const chunker = new LineCodeChunker();
  const file = { absolutePath: '/tmp/src/foo.ts', relativePath: 'src/foo.ts' };

  it('chunks a long file with overlap', async () => {
    const lines = Array.from({ length: 120 }, (_, i) => `line ${i + 1}`);
    const content = lines.join('\n');

    const chunks = await chunker.chunk(file, content, { chunkSizeLines: 50, overlapLines: 10 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(50);
    expect(chunks[1].startLine).toBe(41);
    expect(chunks[1].endLine).toBe(90);
    expect(chunks[chunks.length - 1].endLine).toBe(120);
  });

  it('produces a single chunk for short files', async () => {
    const content = 'line 1\nline 2\nline 3';

    const chunks = await chunker.chunk(file, content, { chunkSizeLines: 50, overlapLines: 10 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(3);
  });

  it('prefixes each chunk with file path and line range', async () => {
    const chunks = await chunker.chunk(file, 'line 1\nline 2', { chunkSizeLines: 50, overlapLines: 10 });

    expect(chunks[0].content).toContain('// file: src/foo.ts lines 1-2');
  });

  it('detects language from extension', async () => {
    const ts = await chunker.chunk(file, 'x', { chunkSizeLines: 50, overlapLines: 10 });
    expect(ts[0].language).toBe('typescript');

    const pyFile = { absolutePath: '/tmp/app.py', relativePath: 'app.py' };
    const py = await chunker.chunk(pyFile, 'x', { chunkSizeLines: 50, overlapLines: 10 });
    expect(py[0].language).toBe('python');
  });

  it('throws on invalid options', async () => {
    await expect(chunker.chunk(file, 'x', { chunkSizeLines: 0, overlapLines: 0 })).rejects.toThrow();
    await expect(chunker.chunk(file, 'x', { chunkSizeLines: 10, overlapLines: 10 })).rejects.toThrow();
    await expect(chunker.chunk(file, 'x', { chunkSizeLines: 10, overlapLines: -1 })).rejects.toThrow();
  });
});
