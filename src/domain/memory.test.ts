import { describe, it, expect } from 'vitest';
import { createMemory, updateMemory, memoryToPlainText } from './memory.js';

describe('createMemory', () => {
  it('creates a memory with defaults', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'Content',
    });

    expect(memory.title).toBe('Test');
    expect(memory.type).toBe('knowledge');
    expect(memory.source).toBe('manual');
    expect(memory.tags).toEqual([]);
    expect(memory.confidence).toBe(1);
    expect(memory.id.startsWith('mem_')).toBe(true);
  });

  it('creates a memory with optional summary and entities', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'Content',
      summary: 'A test memory.',
      entities: ['TestEntity'],
    });

    expect(memory.summary).toBe('A test memory.');
    expect(memory.entities).toEqual(['TestEntity']);
  });
});

describe('updateMemory', () => {
  it('updates title and timestamps', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Old',
      content: 'Content',
    });

    const updated = updateMemory(memory, { title: 'New' });

    expect(updated.title).toBe('New');
    expect(updated.content).toBe('Content');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(memory.updatedAt.getTime());
  });

  it('preserves existing summary and entities when not provided', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Old',
      content: 'Content',
      summary: 'Original summary.',
      entities: ['OriginalEntity'],
    });

    const updated = updateMemory(memory, { title: 'New' });

    expect(updated.summary).toBe('Original summary.');
    expect(updated.entities).toEqual(['OriginalEntity']);
  });

  it('updates summary and entities when provided', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Old',
      content: 'Content',
      summary: 'Original summary.',
      entities: ['OriginalEntity'],
    });

    const updated = updateMemory(memory, {
      summary: 'New summary.',
      entities: ['NewEntity'],
    });

    expect(updated.summary).toBe('New summary.');
    expect(updated.entities).toEqual(['NewEntity']);
  });
});

describe('memoryToPlainText', () => {
  it('concatenates title and content', () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Title',
      content: 'Body',
    });

    expect(memoryToPlainText(memory)).toBe('Title\n\nBody');
  });
});
