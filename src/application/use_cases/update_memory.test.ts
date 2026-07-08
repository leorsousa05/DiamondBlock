import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateMemoryUseCase } from './update_memory.js';
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

  async searchWithScore(): Promise<Array<{ memory: Memory; score: number }>> {
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

const baseMemory = {
  id: 'mem_abc123',
  type: 'knowledge' as MemoryInput['type'],
  scope: 'global',
  title: 'Original',
  content: 'Original content',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  source: 'manual',
  tags: [],
  confidence: 1.0,
};

describe('UpdateMemoryUseCase', () => {
  let repo: FakeMemoryRepository;
  let vectorIndex: FakeVectorIndex;
  let embeddingProvider: FakeEmbeddingProvider;
  let enrichmentService: FakeEnrichmentService;
  let useCase: UpdateMemoryUseCase;

  beforeEach(() => {
    repo = new FakeMemoryRepository();
    vectorIndex = new FakeVectorIndex();
    embeddingProvider = new FakeEmbeddingProvider();
    enrichmentService = new FakeEnrichmentService();
    useCase = new UpdateMemoryUseCase(repo, vectorIndex, embeddingProvider, enrichmentService);
  });

  it('updates title and content and preserves id and createdAt', async () => {
    await repo.save(baseMemory);

    await useCase.execute({
      id: baseMemory.id,
      title: 'Updated',
      content: 'Updated content',
    });

    const updated = await repo.findById(baseMemory.id);
    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(baseMemory.id);
    expect(updated?.title).toBe('Updated');
    expect(updated?.content).toBe('Updated content');
    expect(updated?.createdAt).toEqual(baseMemory.createdAt);
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(baseMemory.updatedAt.getTime());
  });

  it('updates type and scope and triggers repository relocation', async () => {
    const memory = { ...baseMemory, title: 'Title', content: 'Content' };
    await repo.save(memory);

    await useCase.execute({
      id: memory.id,
      type: 'project',
      scope: 'project/demo',
    });

    const updated = await repo.findById(memory.id);
    expect(updated?.type).toBe('project');
    expect(updated?.scope).toBe('project/demo');
    expect(repo.resolvePath(updated!)).toBe('vault/Memory/project/project/demo/mem_abc123.md');
  });

  it('appends content when append is true', async () => {
    await repo.save(baseMemory);

    await useCase.execute({
      id: baseMemory.id,
      content: 'Appended',
      append: true,
    });

    const updated = await repo.findById(baseMemory.id);
    expect(updated?.content).toBe('Original content\n\nAppended');
  });

  it('normalizes scope before updating', async () => {
    await repo.save(baseMemory);

    await useCase.execute({
      id: baseMemory.id,
      scope: '  GLOBAL  ',
    });

    const updated = await repo.findById(baseMemory.id);
    expect(updated?.scope).toBe('global');
  });

  it('derives project scope from projectId when type changes to project', async () => {
    await repo.save(baseMemory);

    await useCase.execute({
      id: baseMemory.id,
      type: 'project',
      projectId: 'demo',
    });

    const updated = await repo.findById(baseMemory.id);
    expect(updated?.type).toBe('project');
    expect(updated?.scope).toBe('project/demo');
  });

  it('overrides non-project scope with projectId for project type', async () => {
    const memory = { ...baseMemory, title: 'Title', content: 'Content' };
    await repo.save(memory);

    await useCase.execute({
      id: memory.id,
      type: 'project',
      scope: 'global',
      projectId: 'demo',
    });

    const updated = await repo.findById(memory.id);
    expect(updated?.scope).toBe('project/demo');
  });

  it('throws when project type lacks project scope and projectId', async () => {
    await repo.save(baseMemory);

    await expect(
      useCase.execute({
        id: baseMemory.id,
        type: 'project',
      })
    ).rejects.toThrow(/requires a project scope or projectId/);
  });

  it('throws when memory is not found', async () => {
    await expect(useCase.execute({ id: 'missing', title: 'X' })).rejects.toThrow(
      'Memory not found: missing'
    );
  });

  it('triggers enrichment asynchronously without blocking return', async () => {
    await repo.save(baseMemory);

    await useCase.execute({
      id: baseMemory.id,
      title: 'Updated',
    });

    expect(enrichmentService.enriched.length).toBe(1);
    expect(enrichmentService.enriched[0]?.id).toBe(baseMemory.id);
    expect(enrichmentService.enriched[0]?.title).toBe('Updated');
  });

  it('works without enrichment service', async () => {
    useCase = new UpdateMemoryUseCase(repo, vectorIndex, embeddingProvider);
    await repo.save(baseMemory);

    await useCase.execute({
      id: baseMemory.id,
      title: 'Updated',
    });

    const updated = await repo.findById(baseMemory.id);
    expect(updated?.title).toBe('Updated');
  });
});
