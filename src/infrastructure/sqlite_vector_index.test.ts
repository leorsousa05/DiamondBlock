import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SqliteVectorIndex } from '../infrastructure/sqlite_vector_index.js';

function zeroVector(): number[] {
  return Array.from({ length: 384 }, () => 0);
}

function vectorWith(value: number, at: number): number[] {
  const v = zeroVector();
  v[at] = value;
  return v;
}

function makeMemory(id: string, scope: string, type = 'project' as const) {
  return {
    id,
    type,
    scope,
    title: `Memory ${id}`,
    content: `Content ${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'manual',
    tags: [],
    confidence: 1,
  };
}

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

  it('returns all scopes when scope option is omitted', async () => {
    const memory = makeMemory('mem_1', 'global', 'knowledge');

    await index.index(memory, Array.from({ length: 384 }, () => Math.random()));
    const results = await index.search(Array.from({ length: 384 }, () => Math.random()), 5);

    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('returns vectors from all scopes when no scope filter is provided', async () => {
    await index.index(makeMemory('mem_global', 'global', 'knowledge'), vectorWith(1, 0));
    await index.index(makeMemory('mem_project', 'project/my-app', 'project'), vectorWith(1, 1));

    const results = await index.search(vectorWith(1, 0), 10);
    const ids = results.map((r) => r.id).sort();

    expect(ids).toEqual(['mem_global', 'mem_project']);
  });

  it('filters vectors by scope when scope option is provided', async () => {
    await index.index(makeMemory('mem_global', 'global', 'knowledge'), vectorWith(1, 0));
    await index.index(makeMemory('mem_project', 'project/my-app', 'project'), vectorWith(1, 1));

    const results = await index.search(vectorWith(1, 1), 10, { scope: 'project/my-app' });

    expect(results.map((r) => r.id)).toEqual(['mem_project']);
  });

  it('does not return out-of-scope vectors even when they are more similar', async () => {
    const query = vectorWith(1, 0);
    await index.index(makeMemory('mem_project', 'project/my-app', 'project'), vectorWith(0.9, 0));
    await index.index(makeMemory('mem_global', 'global', 'knowledge'), query);

    const results = await index.search(query, 10, { scope: 'project/my-app' });

    expect(results.map((r) => r.id)).toEqual(['mem_project']);
  });

  it('normalizes the scope option before filtering', async () => {
    await index.index(makeMemory('mem_project', 'project/my-app', 'project'), vectorWith(1, 0));

    const results = await index.search(vectorWith(1, 0), 10, { scope: '  Project//My-App  ' });

    expect(results.map((r) => r.id)).toEqual(['mem_project']);
  });
});
