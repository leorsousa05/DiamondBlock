import { updateMemory, type MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';

export interface UpdateMemoryInput {
  id: string;
  title?: string;
  content?: string;
  type?: MemoryInput['type'];
  scope?: string;
  tags?: string[];
  confidence?: number;
  append?: boolean;
}

export class UpdateMemoryUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  async execute(input: UpdateMemoryInput): Promise<void> {
    const existing = await this.memoryRepository.findById(input.id);
    if (!existing) {
      throw new Error(`Memory not found: ${input.id}`);
    }

    const content = input.append && input.content
      ? `${existing.content}\n\n${input.content}`
      : input.content;

    const memory = updateMemory(existing, {
      title: input.title,
      content,
      type: input.type,
      scope: input.scope,
      tags: input.tags,
      confidence: input.confidence,
    });

    await this.memoryRepository.save(memory);

    if (await this.embeddingProvider.isAvailable()) {
      const text = `${memory.title}\n${memory.content}`;
      const embedding = await this.embeddingProvider.embed(text);
      await this.vectorIndex.index(memory, embedding);
    }
  }
}
