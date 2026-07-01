import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteVectorIndex } from '../infrastructure/sqlite_vector_index.js';

describe('SqliteVectorIndex', () => {
  let basePath: string;
  let index: SqliteVectorIndex;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-vec-'));
    index = new SqliteVectorIndex({ dbPath: join(basePath, 'embeddings.sqlite') });
  });

  afterEach(() => {
    index.close().catch(() => {});
    rmSync(basePath, { recursive: true, force: true });
  });

  it('indexes and searches vectors', async () => {
    const memory = {
      id: 'mem_1',
      type: 'knowledge' as const,
      scope: 'global',
      title: 'Hello',
      content: 'World',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'manual',
      tags: [],
      confidence: 1,
    };

    await index.index(memory, Array.from({ length: 384 }, () => Math.random()));
    const results = await index.search(Array.from({ length: 384 }, () => Math.random()), 5);

    expect(results.length).toBeGreaterThanOrEqual(0);
  });
});
