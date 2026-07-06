import { describe, it, expect } from 'vitest';
import { createMemory } from '../domain/memory.js';
import { memoryToMarkdown, memoryFromMarkdown } from './markdown_serializer.js';

describe('memoryToMarkdown / memoryFromMarkdown', () => {
  it('round-trips summary and entities', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test Memory',
      content: 'This is the content of the memory.',
      tags: ['test', 'memory'],
      confidence: 0.9,
      summary: 'A short summary of the memory.',
      entities: ['MemoryEntity', 'TestSubject'],
    });

    const markdown = memoryToMarkdown(memory);
    const parsed = memoryFromMarkdown(memory.id, markdown);

    expect(parsed.summary).toBe(memory.summary);
    expect(parsed.entities).toEqual(memory.entities);
    expect(parsed.title).toBe(memory.title);
    expect(parsed.content).toBe(memory.content);
    expect(parsed.tags).toEqual(memory.tags);
    expect(parsed.confidence).toBe(memory.confidence);
  });

  it('omits undefined summary and entities from frontmatter', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Plain Memory',
      content: 'No extra metadata here.',
    });

    const markdown = memoryToMarkdown(memory);

    expect(markdown).not.toContain('summary:');
    expect(markdown).not.toContain('entities:');
  });

  it('reads legacy files without summary and entities', () => {
    const legacyMarkdown = [
      '---',
      'id: mem_legacy123',
      'type: knowledge',
      'scope: global',
      'created_at: 2026-01-01T00:00:00.000Z',
      'updated_at: 2026-01-01T00:00:00.000Z',
      'source: manual',
      'tags:',
      '  - legacy',
      'confidence: 1',
      '---',
      '',
      '# Legacy Memory',
      '',
      'This memory has no summary or entities.',
    ].join('\n');

    const parsed = memoryFromMarkdown('mem_legacy123', legacyMarkdown);

    expect(parsed.summary).toBeUndefined();
    expect(parsed.entities).toBeUndefined();
    expect(parsed.title).toBe('Legacy Memory');
    expect(parsed.tags).toEqual(['legacy']);
  });

  it('does not serialize empty entity arrays', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Empty Entities',
      content: 'Content.',
      entities: [],
    });

    const markdown = memoryToMarkdown(memory);

    expect(markdown).not.toContain('entities:');
  });
});
