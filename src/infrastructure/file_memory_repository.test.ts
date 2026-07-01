import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileMemoryRepository } from '../infrastructure/file_memory_repository.js';
import { createMemory } from '../domain/memory.js';

describe('FileMemoryRepository', () => {
  let basePath: string;
  let repo: FileMemoryRepository;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-memory-'));
    repo = new FileMemoryRepository({ basePath });
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('saves and finds a memory', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Hello',
      content: 'World',
    });

    await repo.save(memory);
    const found = await repo.findById(memory.id);

    expect(found).not.toBeNull();
    expect(found?.title).toBe('Hello');
    expect(found?.content).toBe('World');
  });

  it('lists memories', async () => {
    await repo.save(createMemory({ type: 'knowledge', scope: 'global', title: 'A', content: 'a' }));
    await repo.save(createMemory({ type: 'knowledge', scope: 'global', title: 'B', content: 'b' }));

    const memories = await repo.list({ limit: 10 });
    expect(memories.length).toBe(2);
  });

  it('deletes a memory', async () => {
    const memory = createMemory({ type: 'knowledge', scope: 'global', title: 'X', content: 'x' });
    await repo.save(memory);
    await repo.delete(memory.id);

    const found = await repo.findById(memory.id);
    expect(found).toBeNull();
  });
});
