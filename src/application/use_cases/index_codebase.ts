import { Scope } from '../../domain/scope.js';
import type { ProjectResolver } from '../ports/project_resolver.js';
import type { CodebaseScanner } from '../ports/codebase_scanner.js';
import type { CodeChunker } from '../ports/code_chunker.js';
import type { CodebaseIndexRepository } from '../ports/codebase_index_repository.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import { CodebaseIndexer, type CodebaseIndexerProgress, type CodebaseIndexerResult } from '../../infrastructure/codebase_indexer.js';

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
    private readonly codeChunker: CodeChunker,
    private readonly codebaseIndexRepository: CodebaseIndexRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly indexerFactory?: (deps: {
      scanner: CodebaseScanner;
      chunker: CodeChunker;
      indexRepository: CodebaseIndexRepository;
      memoryRepository: MemoryRepository;
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

    const indexer =
      this.indexerFactory?.({
        scanner: this.codebaseScanner,
        chunker: this.codeChunker,
        indexRepository: this.codebaseIndexRepository,
        memoryRepository: this.memoryRepository,
        vectorIndex: this.vectorIndex,
        embeddingProvider: this.embeddingProvider,
      }) ??
      new CodebaseIndexer({
        scanner: this.codebaseScanner,
        chunker: this.codeChunker,
        indexRepository: this.codebaseIndexRepository,
        memoryRepository: this.memoryRepository,
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
}
