import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateMemoryUseCase } from './update_memory.js';
import type { Memory, MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository, SearchOptions, ListOptions } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';

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

describe('UpdateMemoryUseCase', () => {
  let repo: FakeMemoryRepository;
  let vectorIndex: FakeVectorIndex;
  let embeddingProvider: FakeEmbeddingProvider;
  let useCase: UpdateMemoryUseCase;

  beforeEach(() => {
    repo = new FakeMemoryRepository();
    vectorIndex = new FakeVectorIndex();
    embeddingProvider = new FakeEmbeddingProvider();
    useCase = new UpdateMemoryUseCase(repo, vectorIndex, embeddingProvider);
  });

  it('updates title and content and preserves id and createdAt', async () => {
    const memory = {
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
    await repo.save(memory);

    await useCase.execute({
      id: memory.id,
      title: 'Updated',
      content: 'Updated content',
    });

    const updated = await repo.findById(memory.id);
    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(memory.id);
    expect(updated?.title).toBe('Updated');
    expect(updated?.content).toBe('Updated content');
    expect(updated?.createdAt).toEqual(memory.createdAt);
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(memory.updatedAt.getTime());
  });

  it('updates type and scope and triggers repository relocation', async () => {
    const memory = {
      id: 'mem_abc123',
      type: 'knowledge' as MemoryInput['type'],
      scope: 'global',
      title: 'Title',
      content: 'Content',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'manual',
      tags: [],
      confidence: 1.0,
    };
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
    const memory = {
      id: 'mem_abc123',
      type: 'knowledge' as MemoryInput['type'],
      scope: 'global',
      title: 'Title',
      content: 'Original',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'manual',
      tags: [],
      confidence: 1.0,
    };
    await repo.save(memory);

    await useCase.execute({
      id: memory.id,
      content: 'Appended',
      append: true,
    });

    const updated = await repo.findById(memory.id);
    expect(updated?.content).toBe('Original\n\nAppended');
  });

  it('updates tags', async () => {
    const memory = {
      id: 'mem_abc123',
      type: 'knowledge' as MemoryInput['type'],
      scope: 'global',
      title: 'Title',
      content: 'Content',
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'manual',
      tags: ['old'],
      confidence: 1.0,
    };
    await repo.save(memory);

    await useCase.execute({
      id: memory.id,
      tags: ['new'],
    });

    const updated = await repo.findById(memory.id);
    expect(updated?.tags).toEqual(['new']);
  });

  it('throws when memory is not found', async () => {
    await expect(useCase.execute({ id: 'missing', title: 'X' })).rejects.toThrow(
      'Memory not found: missing'
    );
  });
});
