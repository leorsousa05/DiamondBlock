import { updateMemory, type MemoryInput } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { MemoryEnrichmentService } from '../../domain/services/memory_enrichment.js';
import { Scope } from '../../domain/scope.js';

export interface UpdateMemoryInput {
  id: string;
  title?: string;
  content?: string;
  type?: MemoryInput['type'];
  scope?: string;
  projectId?: string;
  tags?: string[];
  confidence?: number;
  append?: boolean;
}

export class UpdateMemoryUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly enrichmentService?: MemoryEnrichmentService
  ) {}

  async execute(input: UpdateMemoryInput): Promise<void> {
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

  private resolveScope(existing: { type: MemoryInput['type']; scope: string }, input: UpdateMemoryInput): string {
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
