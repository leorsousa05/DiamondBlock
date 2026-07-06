import { updateMemory, type Memory, type MemoryInput } from '../memory.js';
import type { MemoryRepository } from '../../application/ports/memory_repository.js';
import type { VectorIndex } from '../../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../../application/ports/embedding_provider.js';
import type { EnrichmentProvider, EnrichmentResult } from '../../application/ports/enrichment_provider.js';

export interface MemoryEnrichmentOptions {
  confidenceThreshold?: number;
  maxTags?: number;
  maxEntities?: number;
}

export class MemoryEnrichmentService {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly enrichmentProvider: EnrichmentProvider,
    private readonly options: MemoryEnrichmentOptions = {}
  ) {}

  async enrich(memory: Memory): Promise<void> {
    const result = await this.enrichmentProvider.enrich(memory);
    const threshold = this.options.confidenceThreshold ?? 0.5;

    if (result.confidence < threshold) {
      return;
    }

    const inferredTags = await this.inferTags(memory);
    const mergedTags = mergeUnique([memory.tags, result.tags, inferredTags]);
    const tags = mergedTags.slice(0, this.options.maxTags ?? 10);

    const updates: Partial<MemoryInput> = { tags };

    if (memory.summary === undefined && result.summary.length > 0) {
      updates.summary = result.summary;
    }

    if (memory.entities === undefined) {
      updates.entities = result.entities.slice(0, this.options.maxEntities ?? 10);
    }

    const enriched = updateMemory(memory, updates);
    await this.memoryRepository.save(enriched);
  }

  private async inferTags(memory: Memory): Promise<string[]> {
    if (!(await this.embeddingProvider.isAvailable())) {
      return [];
    }

    const text = `${memory.title}\n${memory.content}`;
    const embedding = await this.embeddingProvider.embed(text);
    const results = await this.vectorIndex.search(embedding, 5);
    const inferred = new Set<string>();

    for (const result of results) {
      if (result.id === memory.id) continue;
      const similar = await this.memoryRepository.findById(result.id);
      if (!similar) continue;
      for (const tag of similar.tags) {
        inferred.add(tag);
      }
    }

    return Array.from(inferred);
  }
}

function mergeUnique(arrays: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const array of arrays) {
    for (const value of array) {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(normalized);
    }
  }
  return merged;
}
