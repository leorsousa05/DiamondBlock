import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { CodebaseScanner } from '../application/ports/codebase_scanner.js';
import type { ParsingPipeline } from './parsing_pipeline.js';
import type { CodebaseIndexRepository } from '../application/ports/codebase_index_repository.js';
import type { CodebaseChunkRepository } from '../application/ports/codebase_chunk_repository.js';
import type { VectorIndex } from '../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import { createCodeChunk } from '../domain/code_chunk.js';
import { createCodebaseChunkFromCodeChunk } from '../domain/code_chunk.js';
import { createEmptyManifest, createFileIndexEntry } from './file_codebase_index_repository.js';

export interface CodebaseIndexerOptions {
  scanner: CodebaseScanner;
  pipeline: ParsingPipeline;
  indexRepository: CodebaseIndexRepository;
  codebaseChunkRepository: CodebaseChunkRepository;
  vectorIndex: VectorIndex;
  embeddingProvider: EmbeddingProvider;
}

export interface CodebaseIndexerProgress {
  onScanStart?(): void;
  onScanComplete?(files: SourceFile[]): void;
  onFileStart?(file: SourceFile, current: number, total: number): void;
  onFileComplete?(file: SourceFile, chunks: number, current: number, total: number): void;
  onSavingStart?(): void;
  onSavingComplete?(): void;
}

export interface CodebaseIndexerResult {
  added: SourceFile[];
  updated: SourceFile[];
  removed: string[];
  unchanged: SourceFile[];
  chunksCreated: number;
  chunksRemoved: number;
}

export class CodebaseIndexer {
  constructor(private readonly options: CodebaseIndexerOptions) {}

  async index(
    projectId: string,
    rootPath: string,
    options: { force?: boolean; dryRun?: boolean; progress?: CodebaseIndexerProgress } = {}
  ): Promise<CodebaseIndexerResult> {
    const progress = options.progress;

    progress?.onScanStart?.();
    const files = await this.options.scanner.scan({ rootPath });
    progress?.onScanComplete?.(files);

    const previousManifest = await this.options.indexRepository.load(projectId);
    const isLegacyManifest = this.hasLegacyMemoryIds(previousManifest);
    const previousFiles = isLegacyManifest ? {} : previousManifest?.files ?? {};

    const currentHashes = await this.computeHashes(files);

    const added: SourceFile[] = [];
    const updated: SourceFile[] = [];
    const unchanged: SourceFile[] = [];
    const currentRelativePaths = new Set(files.map((f) => f.relativePath));

    for (const file of files) {
      const hash = currentHashes.get(file.relativePath);
      if (!hash) continue;

      const previous = previousFiles[file.relativePath];
      if (!previous) {
        added.push(file);
      } else if (previous.contentHash !== hash || options.force || isLegacyManifest) {
        updated.push(file);
      } else {
        unchanged.push(file);
      }
    }

    const removed = Object.keys(previousFiles).filter((path) => !currentRelativePaths.has(path));

    if (options.dryRun) {
      return { added, updated, removed, unchanged, chunksCreated: 0, chunksRemoved: 0 };
    }

    const manifest = createEmptyManifest(projectId, rootPath);
    manifest.createdAt = previousManifest?.createdAt ?? manifest.createdAt;
    let chunksCreated = 0;
    let chunksRemoved = 0;

    for (const file of unchanged) {
      const previous = previousFiles[file.relativePath];
      if (previous) {
        manifest.files[file.relativePath] = previous;
      }
    }

    const filesToIndex = [...added, ...updated];

    for (let i = 0; i < filesToIndex.length; i++) {
      const file = filesToIndex[i];
      progress?.onFileStart?.(file, i + 1, filesToIndex.length);
      const chunkIds = await this.indexFile(projectId, file);
      progress?.onFileComplete?.(file, chunkIds.length, i + 1, filesToIndex.length);
      chunksCreated += chunkIds.length;
      const hash = currentHashes.get(file.relativePath)!;
      manifest.files[file.relativePath] = createFileIndexEntry(file.relativePath, hash, chunkIds);
    }

    progress?.onSavingStart?.();

    for (const relativePath of removed) {
      const entry = previousFiles[relativePath];
      if (entry) {
        chunksRemoved += entry.chunkIds.length;
        await this.removeChunks(entry.chunkIds);
      }
    }

    await this.options.indexRepository.save(manifest);
    progress?.onSavingComplete?.();

    return { added, updated, removed, unchanged, chunksCreated, chunksRemoved };
  }

  private hasLegacyMemoryIds(manifest: import('../application/ports/codebase_index_repository.js').CodebaseIndexManifest | null): boolean {
    if (!manifest) return false;
    return Object.values(manifest.files).some((entry) => 'memoryIds' in entry && Array.isArray((entry as Record<string, unknown>).memoryIds));
  }

  private async computeHashes(files: SourceFile[]): Promise<Map<string, string>> {
    const hashes = new Map<string, string>();
    await Promise.all(
      files.map(async (file) => {
        const content = await readFile(file.absolutePath, 'utf-8');
        const hash = createHash('sha256').update(content).digest('hex');
        hashes.set(file.relativePath, hash);
      })
    );
    return hashes;
  }

  private async indexFile(projectId: string, file: SourceFile): Promise<string[]> {
    const content = await readFile(file.absolutePath, 'utf-8');
    const parsingResult = await this.options.pipeline.process(file, content);
    const chunks = parsingResult.chunks.map((input) => createCodeChunk(input));
    const chunkIds: string[] = [];

    const codebaseChunks = chunks.map((chunk) => {
      const chunkInput = createCodebaseChunkFromCodeChunk(chunk, projectId);
      const now = new Date();
      const codebaseChunk = {
        ...chunkInput,
        type: 'code',
        scope: `project/${projectId}`,
        tags: chunkInput.tags ?? [chunk.language || 'unknown'],
        confidence: chunkInput.confidence ?? 1.0,
        source: chunkInput.source ?? 'codebase-indexer',
        createdAt: now,
        updatedAt: now,
      };
      chunkIds.push(codebaseChunk.id);
      return codebaseChunk;
    });

    await this.options.codebaseChunkRepository.saveAll(codebaseChunks);

    if (codebaseChunks.length > 0 && (await this.options.embeddingProvider.isAvailable())) {
      try {
        const texts = codebaseChunks.map((c) => `${c.title}\n${c.content}`);
        const embeddings = await this.options.embeddingProvider.embedBatch(texts);
        
        const vectorIndexItems = codebaseChunks.map((c, idx) => ({
          item: c,
          embedding: embeddings[idx] ?? [],
        }));

        await this.options.vectorIndex.indexBatch(vectorIndexItems);
      } catch (error) {
        console.warn(
          `Failed to embed chunks for file ${file.relativePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return chunkIds;
  }

  private async removeChunks(chunkIds: string[]): Promise<void> {
    await Promise.all(
      chunkIds.map(async (id) => {
        try {
          await this.options.codebaseChunkRepository.delete(id);
        } catch (error) {
          console.warn(`Failed to delete chunk ${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
        try {
          await this.options.vectorIndex.remove(id);
        } catch (error) {
          console.warn(`Failed to remove vector ${id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      })
    );
  }
}
