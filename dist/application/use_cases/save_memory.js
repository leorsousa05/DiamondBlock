import { createMemory } from '../../domain/memory.js';
import { Scope } from '../../domain/scope.js';
export class SaveMemoryUseCase {
    memoryRepository;
    vectorIndex;
    embeddingProvider;
    enrichmentService;
    constructor(memoryRepository, vectorIndex, embeddingProvider, enrichmentService) {
        this.memoryRepository = memoryRepository;
        this.vectorIndex = vectorIndex;
        this.embeddingProvider = embeddingProvider;
        this.enrichmentService = enrichmentService;
    }
    async execute(input) {
        const scope = this.resolveScope(input);
        const memory = createMemory({
            type: input.type,
            scope,
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
        this.enrichmentService?.enrich(memory).catch((error) => {
            console.error(`Enrichment failed for memory ${memory.id}:`, error);
        });
        return { id: memory.id };
    }
    resolveScope(input) {
        const type = input.type;
        let scope = input.scope ? Scope.normalize(input.scope) : undefined;
        if (type === 'project' || type === 'distilled') {
            if (scope && !Scope.isProject(scope)) {
                throw new Error(`Memory type '${type}' requires a project scope, got '${scope}'`);
            }
            if (!scope) {
                if (!input.projectId) {
                    throw new Error(`Memory type '${type}' requires a project scope or projectId`);
                }
                return Scope.fromTypeAndProject(type, input.projectId);
            }
            return scope;
        }
        if (scope && Scope.isProject(scope)) {
            throw new Error(`Memory type '${type}' cannot use a project scope`);
        }
        return scope ?? Scope.fromTypeAndProject(type, input.projectId);
    }
}
//# sourceMappingURL=save_memory.js.map