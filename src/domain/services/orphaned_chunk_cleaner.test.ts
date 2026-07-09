import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { OrphanedChunkCleaner } from './orphaned_chunk_cleaner.js';
import { FileCodebaseChunkRepository } from '../../infrastructure/file_codebase_chunk_repository.js';
import { FileCodebaseIndexRepository } from '../../infrastructure/file_codebase_index_repository.js';
import { createEmptyManifest, createFileIndexEntry } from '../../infrastructure/file_codebase_index_repository.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { CodebaseChunk } from '../../application/ports/codebase_chunk_repository.js';

class FakeVectorIndex {
  removed: string[] = [];
  async index() {}
  async search() {
    return [];
  }
  async remove(id: string) {
    this.removed.push(id);
  }
}

function makeChunk(id: string, projectId: string): CodebaseChunk {
  const now = new Date();
  return {
    id,
    projectId,
    scope: `project/${projectId}`,
    filePath: 'src/foo.ts',
    startLine: 1,
    endLine: 5,
    language: 'typescript',
    content: 'content',
    title: 'title',
    source: 'codebase-indexer',
    tags: ['code', 'chunk', 'typescript'],
    confidence: 0.95,
    createdAt: now,
    updatedAt: now,
  };
}

describe('OrphanedChunkCleaner', () => {
  let basePath: string;
  let codebaseChunkRepository: FileCodebaseChunkRepository;
  let codebaseIndexRepository: FileCodebaseIndexRepository;
  let vectorIndex: FakeVectorIndex;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), 'db-cleaner-'));
    codebaseChunkRepository = new FileCodebaseChunkRepository({ basePath });
    codebaseIndexRepository = new FileCodebaseIndexRepository({ basePath });
    vectorIndex = new FakeVectorIndex();
  });

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true });
  });

  it('removes only orphaned codebase chunks', async () => {
    const projectId = 'my-project';
    const manifest = createEmptyManifest(projectId, '/tmp/project');
    manifest.files['src/foo.ts'] = createFileIndexEntry('src/foo.ts', 'hash1', ['chunk_aaa']);
    await codebaseIndexRepository.save(manifest);

    const referencedChunk = makeChunk('chunk_aaa', projectId);
    const orphanedChunk = makeChunk('chunk_bbb', projectId);
    const otherProjectChunk = makeChunk('chunk_ccc', 'other-project');

    await codebaseChunkRepository.save(referencedChunk);
    await codebaseChunkRepository.save(orphanedChunk);
    await codebaseChunkRepository.save(otherProjectChunk);

    const cleaner = new OrphanedChunkCleaner({
      codebaseChunkRepository,
      vectorIndex,
      codebaseIndexRepository,
    });

    const result = await cleaner.clean(projectId);

    expect(result.chunkIdsRemoved).toBe(1);
    expect(await codebaseChunkRepository.findById('chunk_aaa')).not.toBeNull();
    expect(await codebaseChunkRepository.findById('chunk_bbb')).toBeNull();
    expect(await codebaseChunkRepository.findById('chunk_ccc')).not.toBeNull();
    expect(vectorIndex.removed).toContain('chunk_bbb');
  });

  it('returns zero when no manifest exists', async () => {
    const cleaner = new OrphanedChunkCleaner({
      codebaseChunkRepository,
      vectorIndex,
      codebaseIndexRepository,
    });

    const result = await cleaner.clean('missing-project');

    expect(result.chunkIdsRemoved).toBe(0);
  });
});
