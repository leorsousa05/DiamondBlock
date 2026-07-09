import type { CodebaseChunkRepository } from '../../application/ports/codebase_chunk_repository.js';
import type { VectorIndex } from '../../application/ports/vector_index.js';
import type { CodebaseIndexRepository } from '../../application/ports/codebase_index_repository.js';

export interface OrphanedChunkCleanerOptions {
  codebaseChunkRepository: CodebaseChunkRepository;
  vectorIndex: VectorIndex;
  codebaseIndexRepository: CodebaseIndexRepository;
}

export interface OrphanedChunkCleanerResult {
  projectId: string;
  chunkIdsRemoved: number;
}

export class OrphanedChunkCleaner {
  constructor(private readonly options: OrphanedChunkCleanerOptions) {}

  async clean(projectId: string): Promise<OrphanedChunkCleanerResult> {
    const manifest = await this.options.codebaseIndexRepository.load(projectId);
    if (!manifest) {
      return { projectId, chunkIdsRemoved: 0 };
    }

    const referencedIds = new Set<string>();
    for (const entry of Object.values(manifest.files)) {
      for (const chunkId of entry.chunkIds) {
        referencedIds.add(chunkId);
      }
    }

    const allChunks = await this.options.codebaseChunkRepository.list({ projectId, limit: 100000 });
    const orphaned = allChunks.filter((chunk) => !referencedIds.has(chunk.id));

    for (const chunk of orphaned) {
      await this.options.codebaseChunkRepository.delete(chunk.id);
      try {
        await this.options.vectorIndex.remove(chunk.id);
      } catch {
        // Ignore vector removal errors; the chunk is already gone.
      }
    }

    return { projectId, chunkIdsRemoved: orphaned.length };
  }
}
