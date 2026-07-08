import { createMemory, type MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { MemoryEnrichmentService } from '../../domain/services/memory_enrichment.js';
import { Scope } from '../../domain/scope.js';

export interface SaveMemoryInput {
  title: string;
  content: string;
  type: MemoryInput['type'];
  scope?: string;
  projectId?: string;
  source?: string;
  tags?: string[];
  confidence?: number;
}

export class SaveMemoryUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly enrichmentService?: MemoryEnrichmentService
  ) {}

  async execute(input: SaveMemoryInput): Promise<{ id: string }> {
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

  private resolveScope(input: SaveMemoryInput): string {
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
