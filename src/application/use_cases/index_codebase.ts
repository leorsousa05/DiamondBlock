import { Scope } from '../../domain/scope.js';
import type { ProjectResolver } from '../ports/project_resolver.js';
import type { CodebaseScanner } from '../ports/codebase_scanner.js';
import type { CodebaseIndexRepository } from '../ports/codebase_index_repository.js';
import type { CodebaseChunkRepository } from '../ports/codebase_chunk_repository.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import { CodebaseIndexer, type CodebaseIndexerProgress, type CodebaseIndexerResult } from '../../infrastructure/codebase_indexer.js';
import type { ParsingPipeline } from '../../infrastructure/parsing_pipeline.js';

export interface IndexCodebaseInput {
  projectPath?: string;
  projectId?: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface IndexCodebaseOutput {
  projectId: string;
  scanned: number;
  indexed: number;
  removed: number;
  chunksCreated: number;
  chunksRemoved: number;
}

export class IndexCodebaseUseCase {
  constructor(
    private readonly projectResolver: ProjectResolver,
    private readonly codebaseScanner: CodebaseScanner,
    private readonly parsingPipeline: ParsingPipeline,
    private readonly codebaseIndexRepository: CodebaseIndexRepository,
    private readonly codebaseChunkRepository: CodebaseChunkRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly indexerFactory?: (deps: {
      scanner: CodebaseScanner;
      pipeline: ParsingPipeline;
      indexRepository: CodebaseIndexRepository;
      codebaseChunkRepository: CodebaseChunkRepository;
      vectorIndex: VectorIndex;
      embeddingProvider: EmbeddingProvider;
    }) => CodebaseIndexer
  ) {}

  async execute(
    input: IndexCodebaseInput,
    progress?: CodebaseIndexerProgress
  ): Promise<IndexCodebaseOutput> {
    const projectPath = input.projectPath ?? process.cwd();

    let projectId: string;
    if (input.projectId) {
      projectId = Scope.normalizeProjectId(input.projectId);
    } else {
      const projectInfo = await this.projectResolver.resolve(projectPath);
      if (!projectInfo) {
        throw new Error(`Could not resolve project from path: ${projectPath}`);
      }
      projectId = projectInfo.projectId;
    }

    await this.cleanupLegacyManifest(projectId);

    const indexer =
      this.indexerFactory?.({
        scanner: this.codebaseScanner,
        pipeline: this.parsingPipeline,
        indexRepository: this.codebaseIndexRepository,
        codebaseChunkRepository: this.codebaseChunkRepository,
        vectorIndex: this.vectorIndex,
        embeddingProvider: this.embeddingProvider,
      }) ??
      new CodebaseIndexer({
        scanner: this.codebaseScanner,
        pipeline: this.parsingPipeline,
        indexRepository: this.codebaseIndexRepository,
        codebaseChunkRepository: this.codebaseChunkRepository,
        vectorIndex: this.vectorIndex,
        embeddingProvider: this.embeddingProvider,
      });

    const result: CodebaseIndexerResult = await indexer.index(projectId, projectPath, {
      force: input.force,
      dryRun: input.dryRun,
      progress,
    });

    const scanned = result.added.length + result.updated.length + result.unchanged.length;
    const indexed = result.added.length + result.updated.length;

    return {
      projectId,
      scanned,
      indexed,
      removed: result.removed.length,
      chunksCreated: result.chunksCreated,
      chunksRemoved: result.chunksRemoved,
    };
  }

  private async cleanupLegacyManifest(projectId: string): Promise<void> {
    const manifest = await this.codebaseIndexRepository.load(projectId);
    if (!manifest) return;

    const hasLegacyEntries = Object.values(manifest.files).some(
      (entry) => 'memoryIds' in entry && Array.isArray((entry as Record<string, unknown>).memoryIds)
    );

    if (!hasLegacyEntries) return;

    // Remove old code memories referenced by the legacy manifest and their vectors,
    // then delete the manifest so the indexer will treat every file as new.
    const referencedMemoryIds = new Set<string>();
    for (const entry of Object.values(manifest.files)) {
      const legacyEntry = entry as unknown as Record<string, unknown>;
      if ('memoryIds' in legacyEntry && Array.isArray(legacyEntry.memoryIds)) {
        for (const id of legacyEntry.memoryIds) {
          if (typeof id === 'string') {
            referencedMemoryIds.add(id);
          }
        }
      }
    }

    for (const memoryId of referencedMemoryIds) {
      try {
        await this.memoryRepository.delete(memoryId);
      } catch {
        // ignore
      }
      try {
        await this.vectorIndex.remove(memoryId);
      } catch {
        // ignore
      }
    }

    await this.codebaseIndexRepository.delete(projectId);
  }
}
