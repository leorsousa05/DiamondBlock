import { Scope } from '../../domain/scope.js';
import type { Memory } from '../../domain/memory.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';

export interface SearchMemoryInput {
  query: string;
  scope?: string;
  limit?: number;
}

export interface SearchMemoryResult {
  id: string;
  title: string;
  score: number;
  scope: string;
  path: string;
}

export class SearchMemoryUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  async execute(input: SearchMemoryInput): Promise<SearchMemoryResult[]> {
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
            if (!memory) return null;
            return {
              id: memory.id,
              title: memory.title,
              score: result.score,
              scope: memory.scope,
              path: this.memoryRepository.resolvePath(memory),
            };
          })
          .filter(Boolean)
          .slice(0, limit) as SearchMemoryResult[];
      } catch (error) {
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

  private async resolveMemories(ids: string[]): Promise<Memory[]> {
    const memories = await Promise.all(ids.map((id) => this.memoryRepository.findById(id)));
    return memories.filter((memory): memory is Memory => memory !== null);
  }
}
