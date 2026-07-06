import { describe, it, expect, beforeEach } from 'vitest';
import { createMemory, type Memory } from '../memory.js';
import { MemoryEnrichmentService } from './memory_enrichment.js';
import type { MemoryRepository, SearchOptions, ListOptions } from '../../application/ports/memory_repository.js';
import type { VectorIndex } from '../../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../../application/ports/embedding_provider.js';
import type { EnrichmentProvider, EnrichmentResult } from '../../application/ports/enrichment_provider.js';

class FakeMemoryRepository implements MemoryRepository {
  private memories = new Map<string, Memory>();

  async findById(id: string): Promise<Memory | null> {
    return this.memories.get(id) ?? null;
  }

  async search(): Promise<Memory[]> {
    return [];
  }

  async save(memory: Memory): Promise<void> {
    this.memories.set(memory.id, memory);
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
  }

  async list(): Promise<Memory[]> {
    return Array.from(this.memories.values());
  }

  resolvePath(memory: Memory): string {
    return `vault/Memory/${memory.type}/${memory.scope}/${memory.id}.md`;
  }
}

class FakeVectorIndex implements VectorIndex {
  async index(): Promise<void> {}
  async search(): Promise<Array<{ id: string; score: number }>> {
    return [];
  }
  async remove(): Promise<void> {}
}

class FakeEmbeddingProvider implements EmbeddingProvider {
  available = true;

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async embed(): Promise<number[]> {
    return [0, 0, 1];
  }
}

class FakeEnrichmentProvider implements EnrichmentProvider {
  result: EnrichmentResult = {
    tags: ['extracted'],
    summary: 'Extracted summary.',
    entities: ['ExtractedEntity'],
    confidence: 0.8,
  };

  async enrich(): Promise<EnrichmentResult> {
    return this.result;
  }
}

class TagInferringVectorIndex implements VectorIndex {
  async index(): Promise<void> {}
  async search(): Promise<Array<{ id: string; score: number }>> {
    return [{ id: 'similar', score: 0.9 }];
  }
  async remove(): Promise<void> {}
}

describe('MemoryEnrichmentService', () => {
  let repo: FakeMemoryRepository;
  let vectorIndex: FakeVectorIndex;
  let embeddingProvider: FakeEmbeddingProvider;
  let enrichmentProvider: FakeEnrichmentProvider;
  let service: MemoryEnrichmentService;

  beforeEach(() => {
    repo = new FakeMemoryRepository();
    vectorIndex = new FakeVectorIndex();
    embeddingProvider = new FakeEmbeddingProvider();
    enrichmentProvider = new FakeEnrichmentProvider();
    service = new MemoryEnrichmentService(
      repo,
      vectorIndex,
      embeddingProvider,
      enrichmentProvider,
      { confidenceThreshold: 0.5, maxTags: 5, maxEntities: 5 }
    );
  });

  it('updates a memory when confidence is above threshold', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This is a test memory with enough content to pass the threshold.',
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.tags).toContain('extracted');
    expect(updated?.summary).toBe('Extracted summary.');
    expect(updated?.entities).toEqual(['ExtractedEntity']);
  });

  it('does not update when confidence is below threshold', async () => {
    enrichmentProvider.result = { ...enrichmentProvider.result, confidence: 0.2 };
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'Content.',
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.tags).toEqual([]);
    expect(updated?.summary).toBeUndefined();
  });

  it('merges inferred tags from similar memories', async () => {
    const similar: Memory = {
      ...createMemory({
        type: 'knowledge',
        scope: 'global',
        title: 'Similar',
        content: 'Similar content.',
        tags: ['inferred'],
      }),
      id: 'similar',
    };
    await repo.save(similar);

    vectorIndex = new TagInferringVectorIndex();
    service = new MemoryEnrichmentService(
      repo,
      vectorIndex,
      embeddingProvider,
      enrichmentProvider,
      { confidenceThreshold: 0.5, maxTags: 10, maxEntities: 5 }
    );

    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This is a test memory with enough content to pass the threshold.',
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.tags).toContain('extracted');
    expect(updated?.tags).toContain('inferred');
  });

  it('normalizes tags to lowercase', async () => {
    enrichmentProvider.result = {
      tags: ['React', 'TypeScript', 'REACT'],
      summary: 'Summary.',
      entities: [],
      confidence: 0.9,
    };

    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This memory receives mixed-case tags.',
      tags: ['react'],
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.tags).toEqual(['react', 'typescript']);
  });

  it('respects maxTags', async () => {
    enrichmentProvider.result = {
      tags: ['one', 'two', 'three', 'four', 'five', 'six'],
      summary: 'Summary.',
      entities: [],
      confidence: 0.9,
    };

    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This memory has many tags but the service should limit them.',
      tags: ['existing'],
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.tags.length).toBeLessThanOrEqual(5);
  });

  it('respects maxEntities', async () => {
    enrichmentProvider.result = {
      tags: [],
      summary: 'Summary.',
      entities: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
      confidence: 0.9,
    };

    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This memory has many entities but the service should limit them.',
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.entities?.length).toBeLessThanOrEqual(5);
  });

  it('skips vector inference when embeddings are unavailable', async () => {
    embeddingProvider.available = false;
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This is a test memory with enough content to pass the threshold.',
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.tags).toContain('extracted');
  });

  it('preserves existing summary and entities', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Test',
      content: 'This is a test memory with enough content to pass the threshold.',
      summary: 'Existing summary.',
      entities: ['ExistingEntity'],
    });
    await repo.save(memory);

    await service.enrich(memory);

    const updated = await repo.findById(memory.id);
    expect(updated?.summary).toBe('Existing summary.');
    expect(updated?.entities).toEqual(['ExistingEntity']);
  });
});
