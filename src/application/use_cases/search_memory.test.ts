import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SearchMemoryUseCase } from './search_memory.js';
import { FileMemoryRepository } from '../../infrastructure/file_memory_repository.js';
import { createMemory } from '../../domain/memory.js';

class FakeVectorIndex {
  private data = new Map<string, number[]>();

  async index(memory: { id: string }, embedding: number[]): Promise<void> {
    this.data.set(memory.id, embedding);
  }

  async search(embedding: number[], limit: number): Promise<Array<{ id: string; score: number }>> {
    const results: Array<{ id: string; score: number }> = [];
    for (const [id, stored] of this.data.entries()) {
      const score = this.cosineSimilarity(embedding, stored);
      results.push({ id, score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async remove(): Promise<void> {}

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

class FakeEmbeddingProvider {
  available = true;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async embed(text: string): Promise<number[]> {
    if (text.includes('project alpha')) return [1, 0, 0];
    if (text.includes('project beta')) return [0, 1, 0];
    return [0, 0, 1];
  }
}

describe('SearchMemoryUseCase', () => {
  let basePath: string;
  let repo: FileMemoryRepository;
  let vectorIndex: FakeVectorIndex;
  let embeddingProvider: FakeEmbeddingProvider;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-search-'));
    repo = new FileMemoryRepository({ basePath });
    vectorIndex = new FakeVectorIndex();
    embeddingProvider = new FakeEmbeddingProvider();
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('returns semantic search results when embeddings are available', async () => {
    const alpha = createMemory({
      type: 'project',
      scope: 'project/alpha',
      title: 'Alpha',
      content: 'project alpha notes',
    });
    const beta = createMemory({
      type: 'project',
      scope: 'project/beta',
      title: 'Beta',
      content: 'project beta notes',
    });

    await repo.save(alpha);
    await repo.save(beta);
    await vectorIndex.index(alpha, [1, 0, 0]);
    await vectorIndex.index(beta, [0, 1, 0]);

    const useCase = new SearchMemoryUseCase(repo, vectorIndex, embeddingProvider);
    const results = await useCase.execute({ query: 'project alpha', limit: 5 });

    expect(results.length).toBe(2);
    expect(results[0]?.id).toBe(alpha.id);
    expect(results[0]?.score).toBeGreaterThan(0.99);
  });

  it('filters results by scope', async () => {
    const alpha = createMemory({
      type: 'project',
      scope: 'project/alpha',
      title: 'Alpha',
      content: 'project alpha notes',
    });
    const beta = createMemory({
      type: 'project',
      scope: 'project/beta',
      title: 'Beta',
      content: 'project beta notes',
    });

    await repo.save(alpha);
    await repo.save(beta);
    await vectorIndex.index(alpha, [1, 0, 0]);
    await vectorIndex.index(beta, [0, 1, 0]);

    const useCase = new SearchMemoryUseCase(repo, vectorIndex, embeddingProvider);
    const results = await useCase.execute({ query: 'project', scope: 'project/alpha', limit: 5 });

    expect(results.length).toBe(1);
    expect(results[0]?.id).toBe(alpha.id);
  });

  it('falls back to keyword search when embeddings are unavailable', async () => {
    embeddingProvider.available = false;
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Database',
      content: 'Use PostgreSQL for relational data',
    });

    await repo.save(memory);

    const useCase = new SearchMemoryUseCase(repo, vectorIndex, embeddingProvider);
    const results = await useCase.execute({ query: 'PostgreSQL', limit: 5 });

    expect(results.length).toBe(1);
    expect(results[0]?.id).toBe(memory.id);
    expect(results[0]?.score).toBe(0.5);
  });

  it('returns empty array when nothing matches', async () => {
    const useCase = new SearchMemoryUseCase(repo, vectorIndex, embeddingProvider);
    const results = await useCase.execute({ query: 'nonexistent', limit: 5 });
    expect(results).toEqual([]);
  });
});
