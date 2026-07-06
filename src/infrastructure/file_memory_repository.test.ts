import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { FileMemoryRepository } from '../infrastructure/file_memory_repository.js';
import { createMemory } from '../domain/memory.js';
import { memoryToMarkdown } from '../infrastructure/markdown_serializer.js';

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

  it('leaves the file in place when type changes', async () => {
    const memory = createMemory({ type: 'knowledge', scope: 'global', title: 'X', content: 'x' });
    await repo.save(memory);
    const path = repo.resolvePath(memory);

    memory.type = 'user';
    await repo.save(memory);

    expect(existsSync(path)).toBe(true);
    expect(await repo.findById(memory.id)).not.toBeNull();
  });

  it('leaves the file in place when scope changes', async () => {
    const memory = createMemory({ type: 'project', scope: 'project/alpha', title: 'X', content: 'x' });
    await repo.save(memory);
    const path = repo.resolvePath(memory);

    memory.scope = 'project/beta';
    await repo.save(memory);

    expect(existsSync(path)).toBe(true);
    expect(await repo.findById(memory.id)).not.toBeNull();
  });

  it('migrates a legacy hierarchical file to the flat layout on save', async () => {
    const memory = createMemory({ type: 'project', scope: 'project/demo', title: 'X', content: 'x' });
    const legacyPath = join(repo['memoryDir'], 'project', 'demo', `${memory.id}.md`);
    const flatPath = repo.resolvePath(memory);

    await mkdir(dirname(legacyPath), { recursive: true });
    await writeFile(legacyPath, memoryToMarkdown(memory), 'utf-8');

    memory.content = 'Updated content';
    await repo.save(memory);

    expect(existsSync(flatPath)).toBe(true);
    expect(existsSync(legacyPath)).toBe(false);
    const found = await repo.findById(memory.id);
    expect(found?.content).toBe('Updated content');
  });

  it('leaves the file in place when nothing changes', async () => {
    const memory = createMemory({ type: 'knowledge', scope: 'global', title: 'X', content: 'x' });
    await repo.save(memory);
    const path = repo.resolvePath(memory);

    await repo.save(memory);

    expect(existsSync(path)).toBe(true);
    expect(await repo.findById(memory.id)).not.toBeNull();
  });

  it('returns the correct id for a project-scoped memory', async () => {
    const memory = createMemory({ type: 'project', scope: 'project/demo', title: 'Demo', content: 'd' });
    await repo.save(memory);

    const memories = await repo.list({ limit: 10 });
    expect(memories.length).toBe(1);
    expect(memories[0]?.id).toBe(memory.id);
  });

  it('resolvePath matches the path used by save', async () => {
    const memory = createMemory({ type: 'project', scope: 'project/demo', title: 'Demo', content: 'd' });
    await repo.save(memory);

    const expected = repo.resolvePath(memory);
    const found = await repo.findById(memory.id);
    expect(found).not.toBeNull();
    expect(repo.resolvePath(found!)).toBe(expected);
  });
});
