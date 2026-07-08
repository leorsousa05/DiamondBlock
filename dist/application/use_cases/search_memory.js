import { Scope } from '../../domain/scope.js';
export class SearchMemoryUseCase {
    memoryRepository;
    vectorIndex;
    embeddingProvider;
    constructor(memoryRepository, vectorIndex, embeddingProvider) {
        this.memoryRepository = memoryRepository;
        this.vectorIndex = vectorIndex;
        this.embeddingProvider = embeddingProvider;
    }
    async execute(input) {
        const limit = input.limit ?? 5;
        const scope = input.scope ? Scope.normalize(input.scope) : undefined;
        if (await this.embeddingProvider.isAvailable()) {
            try {
                const embedding = await this.embeddingProvider.embed(input.query);
                const vectorResults = await this.vectorIndex.search(embedding, limit, scope ? { scope } : undefined);
                const memories = await this.resolveMemories(vectorResults.map((r) => r.id));
                return vectorResults
                    .map((result) => {
                    const memory = memories.find((m) => m.id === result.id);
                    if (!memory)
                        return null;
                    return {
                        id: memory.id,
                        title: memory.title,
                        score: result.score,
                        scope: memory.scope,
                        path: this.memoryRepository.resolvePath(memory),
                    };
                })
                    .filter(Boolean)
                    .slice(0, limit);
            }
            catch (error) {
                console.warn(`Semantic search failed, falling back to keyword search: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        const memories = await this.memoryRepository.search({
            query: input.query,
            scope,
            limit,
        });
        return memories.map((memory) => ({
            id: memory.id,
            title: memory.title,
            score: 0.5,
            scope: memory.scope,
            path: this.memoryRepository.resolvePath(memory),
        }));
    }
    async resolveMemories(ids) {
        const memories = await Promise.all(ids.map((id) => this.memoryRepository.findById(id)));
        return memories.filter((memory) => memory !== null);
    }
}
//# sourceMappingURL=search_memory.js.map