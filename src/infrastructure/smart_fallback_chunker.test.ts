import { describe, expect, it } from 'vitest';
import { SmartFallbackChunker } from './smart_fallback_chunker.js';

describe('SmartFallbackChunker', () => {
  const file = { absolutePath: '/tmp/config.md', relativePath: 'config.md' };
  const chunker = new SmartFallbackChunker();

  it('splits markdown by headings', () => {
    const content = '# Intro\nline1\n\n# Setup\nline2\n\n# API\nline3';

    const chunks = chunker.chunk(file, content);

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0].content).toContain('# Intro');
    expect(chunks.some((c) => c.content.includes('# Setup'))).toBe(true);
    expect(chunks.some((c) => c.content.includes('# API'))).toBe(true);
  });

  it('splits yaml by blank line groups', () => {
    const content = 'key1: value1\nkey2: value2\n\nkey3: value3\nkey4: value4';

    const chunks = chunker.chunk(file, content);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to size-based splitting for dense content', () => {
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i + 1}`);
    const content = lines.join('\n');

    const chunks = chunker.chunk(file, content);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[chunks.length - 1].endLine).toBe(500);
  });

  it('marks chunks as fallback with low confidence', () => {
    const content = 'line1\n\nline2';

    const chunks = chunker.chunk(file, content);

    expect(chunks[0].metadata).toBeDefined();
    expect(chunks[0].metadata?.parsingMode).toBe('fallback');
    expect(chunks[0].metadata?.confidence).toBe(0.35);
    expect(chunks[0].metadata?.supportsGraph).toBe(false);
    expect(chunks[0].metadata?.supportsSymbols).toBe(false);
  });

  it('returns empty array for empty content', () => {
    const chunks = chunker.chunk(file, '');

    expect(chunks).toHaveLength(0);
  });

  it('detects region markers as delimiters', () => {
    const content = 'a\n// region handlers\nb\n// endregion\nc';

    const chunks = chunker.chunk(file, content);

    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
