import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';

export class DeleteMemoryUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex
  ) {}

  async execute(id: string): Promise<void> {
    await this.memoryRepository.delete(id);
    await this.vectorIndex.remove(id);
  }
}
