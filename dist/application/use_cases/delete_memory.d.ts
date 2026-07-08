import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
export declare class DeleteMemoryUseCase {
    private readonly memoryRepository;
    private readonly vectorIndex;
    constructor(memoryRepository: MemoryRepository, vectorIndex: VectorIndex);
    execute(id: string): Promise<void>;
}
//# sourceMappingURL=delete_memory.d.ts.map