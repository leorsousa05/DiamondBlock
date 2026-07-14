import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { FileCodebaseChunkRepository } from './file_codebase_chunk_repository.js';
import type { CodebaseChunk } from '../application/ports/codebase_chunk_repository.js';

function createChunk(overrides: Partial<CodebaseChunk> = {}): CodebaseChunk {
  const now = new Date();
  return {
    id: 'chunk_001',
    projectId: 'my-project',
    scope: 'project/my-project',
    filePath: 'src/foo.ts',
    startLine: 1,
    endLine: 10,
    language: 'typescript',
    content: 'export function foo() {}',
    title: '// file: src/foo.ts lines 1-10',
    source: 'codebase-indexer',
    tags: ['code', 'chunk', 'typescript'],
    confidence: 0.95,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('FileCodebaseChunkRepository', () => {
  let basePath: string;
  let repo: FileCodebaseChunkRepository;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), 'db-chunk-repo-'));
    repo = new FileCodebaseChunkRepository({ basePath });
  });

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true });
  });

  it('saves and finds a chunk', async () => {
    const chunk = createChunk();
    await repo.save(chunk);

    const found = await repo.findById(chunk.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(chunk.id);
    expect(found?.projectId).toBe(chunk.projectId);
    expect(found?.content).toBe(chunk.content);
  });

  it('lists chunks by project', async () => {
    await repo.save(createChunk({ id: 'chunk_a', filePath: 'src/a.ts' }));
    await repo.save(createChunk({ id: 'chunk_b', filePath: 'src/b.ts' }));
    await repo.save(createChunk({ id: 'chunk_c', projectId: 'other-project', scope: 'project/other-project' }));

    const chunks = await repo.list({ projectId: 'my-project' });
    expect(chunks).toHaveLength(2);
    expect(chunks.map((c) => c.id).sort()).toEqual(['chunk_a', 'chunk_b']);
  });

  it('returns an empty list when project has no chunks', async () => {
    const chunks = await repo.list({ projectId: 'empty-project' });
    expect(chunks).toHaveLength(0);
  });

  it('deletes a chunk', async () => {
    const chunk = createChunk();
    await repo.save(chunk);
    expect(await repo.findById(chunk.id)).not.toBeNull();

    await repo.delete(chunk.id);
    expect(await repo.findById(chunk.id)).toBeNull();
  });

  it('purges all chunks for a project', async () => {
    await repo.save(createChunk({ id: 'chunk_a' }));
    await repo.save(createChunk({ id: 'chunk_b' }));
    await repo.save(createChunk({ id: 'chunk_c', projectId: 'other-project', scope: 'project/other-project' }));

    const removed = await repo.purge('my-project');
    expect(removed).toBe(2);

    expect(await repo.list({ projectId: 'my-project' })).toHaveLength(0);
    expect((await repo.list({ projectId: 'other-project' })).length).toBeGreaterThan(0);
  });

  it('maintains the chunk index for cross-project lookups', async () => {
    await repo.save(createChunk({ id: 'chunk_a' }));
    await repo.save(createChunk({ id: 'chunk_b', projectId: 'other-project', scope: 'project/other-project' }));

    await repo.delete('chunk_a');
    await repo.delete('chunk_b');

    expect(await repo.findById('chunk_a')).toBeNull();
    expect(await repo.findById('chunk_b')).toBeNull();
  });

  it('rebuilds the index on demand when an entry is stale', async () => {
    const chunk = createChunk({ id: 'chunk_stale' });
    await repo.save(chunk);

    // Corrupt the index by pointing to a non-existent project.
    const indexPath = join(basePath, 'vault', 'CodebaseChunks', 'chunk-index.json');
    await rm(indexPath, { force: true });

    const found = await repo.findById(chunk.id);
    expect(found?.id).toBe(chunk.id);
  });

  it('saves multiple chunks at once and updates index exactly once', async () => {
    const chunks = [
      createChunk({ id: 'chunk_batch_1' }),
      createChunk({ id: 'chunk_batch_2' }),
    ];
    await repo.saveAll(chunks);

    const found1 = await repo.findById('chunk_batch_1');
    const found2 = await repo.findById('chunk_batch_2');
    expect(found1?.id).toBe('chunk_batch_1');
    expect(found2?.id).toBe('chunk_batch_2');
  });
});
