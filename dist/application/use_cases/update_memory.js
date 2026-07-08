import { updateMemory } from '../../domain/memory.js';
import { Scope } from '../../domain/scope.js';
export class UpdateMemoryUseCase {
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
        const existing = await this.memoryRepository.findById(input.id);
        if (!existing) {
            throw new Error(`Memory not found: ${input.id}`);
        }
        const content = input.append && input.content
            ? `${existing.content}\n\n${input.content}`
            : input.content;
        const scope = this.resolveScope(existing, input);
        const memory = updateMemory(existing, {
            title: input.title,
            content,
            type: input.type,
            scope,
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
    }
    resolveScope(existing, input) {
        const type = input.type ?? existing.type;
        let scope = input.scope ? Scope.normalize(input.scope) : existing.scope;
        if (type === 'project' || type === 'distilled') {
            if (!Scope.isProject(scope)) {
                if (!input.projectId) {
                    throw new Error(`Memory type '${type}' requires a project scope or projectId`);
                }
                return Scope.fromTypeAndProject(type, input.projectId);
            }
            return scope;
        }
        if (Scope.isProject(scope)) {
            throw new Error(`Memory type '${type}' cannot use a project scope`);
        }
        return scope;
    }
}
//# sourceMappingURL=update_memory.js.map