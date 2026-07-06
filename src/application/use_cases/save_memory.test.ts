import { describe, it, expect, beforeEach } from 'vitest';
import { SaveMemoryUseCase } from './save_memory.js';
import type { Memory, MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository, SearchOptions, ListOptions } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { MemoryEnrichmentService } from '../../domain/services/memory_enrichment.js';

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

class FakeEnrichmentService implements MemoryEnrichmentService {
  enriched: Memory[] = [];

  async enrich(memory: Memory): Promise<void> {
    this.enriched.push(memory);
  }
}

describe('SaveMemoryUseCase', () => {
  let repo: FakeMemoryRepository;
  let vectorIndex: FakeVectorIndex;
  let embeddingProvider: FakeEmbeddingProvider;
  let enrichmentService: FakeEnrichmentService;
  let useCase: SaveMemoryUseCase;

  beforeEach(() => {
    repo = new FakeMemoryRepository();
    vectorIndex = new FakeVectorIndex();
    embeddingProvider = new FakeEmbeddingProvider();
    enrichmentService = new FakeEnrichmentService();
    useCase = new SaveMemoryUseCase(repo, vectorIndex, embeddingProvider, enrichmentService);
  });

  it('saves a memory and returns id', async () => {
    const result = await useCase.execute({
      title: 'Hello',
      content: 'World',
      type: 'knowledge',
      scope: 'global',
    });

    expect(result.id.startsWith('mem_')).toBe(true);
    const saved = await repo.findById(result.id);
    expect(saved?.title).toBe('Hello');
    expect(saved?.content).toBe('World');
  });

  it('triggers enrichment asynchronously without blocking return', async () => {
    const result = await useCase.execute({
      title: 'Hello',
      content: 'World',
      type: 'knowledge',
      scope: 'global',
    });

    expect(enrichmentService.enriched.length).toBe(1);
    expect(enrichmentService.enriched[0]?.id).toBe(result.id);
  });

  it('works without enrichment service', async () => {
    useCase = new SaveMemoryUseCase(repo, vectorIndex, embeddingProvider);

    const result = await useCase.execute({
      title: 'Hello',
      content: 'World',
      type: 'knowledge',
      scope: 'global',
    });

    expect(result.id).toBeDefined();
    const saved = await repo.findById(result.id);
    expect(saved).not.toBeNull();
  });
});
