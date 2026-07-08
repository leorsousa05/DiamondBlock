export class DeleteMemoryUseCase {
    memoryRepository;
    vectorIndex;
    constructor(memoryRepository, vectorIndex) {
        this.memoryRepository = memoryRepository;
        this.vectorIndex = vectorIndex;
    }
    async execute(id) {
        await this.memoryRepository.delete(id);
        await this.vectorIndex.remove(id);
    }
}
//# sourceMappingURL=delete_memory.js.map