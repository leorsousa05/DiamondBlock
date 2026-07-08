import { updateMemory } from '../memory.js';
export class MemoryEnrichmentService {
    memoryRepository;
    vectorIndex;
    embeddingProvider;
    enrichmentProvider;
    options;
    constructor(memoryRepository, vectorIndex, embeddingProvider, enrichmentProvider, options = {}) {
        this.memoryRepository = memoryRepository;
        this.vectorIndex = vectorIndex;
        this.embeddingProvider = embeddingProvider;
        this.enrichmentProvider = enrichmentProvider;
        this.options = options;
    }
    async enrich(memory) {
        const result = await this.enrichmentProvider.enrich(memory);
        const threshold = this.options.confidenceThreshold ?? 0.5;
        if (result.confidence < threshold) {
            return;
        }
        const inferredTags = await this.inferTags(memory);
        const mergedTags = mergeUnique([memory.tags, result.tags, inferredTags]);
        const tags = mergedTags.slice(0, this.options.maxTags ?? 10);
        const updates = { tags };
        if (memory.summary === undefined && result.summary.length > 0) {
            updates.summary = result.summary;
        }
        if (memory.entities === undefined) {
            updates.entities = result.entities.slice(0, this.options.maxEntities ?? 10);
        }
        const enriched = updateMemory(memory, updates);
        await this.memoryRepository.save(enriched);
    }
    async inferTags(memory) {
        if (!(await this.embeddingProvider.isAvailable())) {
            return [];
        }
        const text = `${memory.title}\n${memory.content}`;
        const embedding = await this.embeddingProvider.embed(text);
        const results = await this.vectorIndex.search(embedding, 5);
        const inferred = new Set();
        for (const result of results) {
            if (result.id === memory.id)
                continue;
            const similar = await this.memoryRepository.findById(result.id);
            if (!similar)
                continue;
            for (const tag of similar.tags) {
                inferred.add(tag);
            }
        }
        return Array.from(inferred);
    }
}
function mergeUnique(arrays) {
    const seen = new Set();
    const merged = [];
    for (const array of arrays) {
        for (const value of array) {
            const normalized = value.toLowerCase();
            if (seen.has(normalized))
                continue;
            seen.add(normalized);
            merged.push(normalized);
        }
    }
    return merged;
}
//# sourceMappingURL=memory_enrichment.js.map