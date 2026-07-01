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
