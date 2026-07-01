import { createMemory, type MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';

export interface SaveMemoryInput {
  title: string;
  content: string;
  type: MemoryInput['type'];
  scope: string;
  source?: string;
  tags?: string[];
  confidence?: number;
}

export class SaveMemoryUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  async execute(input: SaveMemoryInput): Promise<{ id: string }> {
    const memory = createMemory({
      type: input.type,
      scope: input.scope,
      title: input.title,
      content: input.content,
      source: input.source ?? 'manual',
      tags: input.tags,
      confidence: input.confidence,
    });

    await this.memoryRepository.save(memory);

    if (await this.embeddingProvider.isAvailable()) {
      const text = `${memory.title}\n${memory.content}`;
      const embedding = await this.embeddingProvider.embed(text);
      await this.vectorIndex.index(memory, embedding);
    }

    return { id: memory.id };
  }
}
