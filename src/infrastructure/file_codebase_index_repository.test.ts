import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { FileCodebaseIndexRepository, createEmptyManifest } from './file_codebase_index_repository.js';

describe('FileCodebaseIndexRepository', () => {
  let basePath: string;
  let repo: FileCodebaseIndexRepository;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), 'db-index-repo-'));
    repo = new FileCodebaseIndexRepository({ basePath });
  });

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true });
  });

  it('returns null when manifest does not exist', async () => {
    const manifest = await repo.load('nonexistent');
    expect(manifest).toBeNull();
  });

  it('saves and loads a manifest', async () => {
    const manifest = createEmptyManifest('my-project', '/path/to/project');
    manifest.files['src/foo.ts'] = {
      relativePath: 'src/foo.ts',
      contentHash: 'abc123',
      indexedAt: new Date().toISOString(),
      chunkIds: ['chunk_1'],
    };

    await repo.save(manifest);
    const loaded = await repo.load('my-project');

    expect(loaded).not.toBeNull();
    expect(loaded?.projectId).toBe('my-project');
    expect(loaded?.rootPath).toBe('/path/to/project');
    expect(loaded?.files['src/foo.ts'].contentHash).toBe('abc123');
  });

  it('deletes a manifest', async () => {
    const manifest = createEmptyManifest('my-project', '/path');
    await repo.save(manifest);
    await repo.delete('my-project');

    const loaded = await repo.load('my-project');
    expect(loaded).toBeNull();
  });
});
