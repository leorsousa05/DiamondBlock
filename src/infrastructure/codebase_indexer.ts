import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { CodebaseScanner } from '../application/ports/codebase_scanner.js';
import type { CodeChunker } from '../application/ports/code_chunker.js';
import type { CodebaseIndexRepository } from '../application/ports/codebase_index_repository.js';
import type { MemoryRepository } from '../application/ports/memory_repository.js';
import type { VectorIndex } from '../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import { createCodeChunk, codeChunkToMemory } from '../domain/code_chunk.js';
import { createMemory } from '../domain/memory.js';
import { createEmptyManifest, createFileIndexEntry } from './file_codebase_index_repository.js';

export interface CodebaseIndexerOptions {
  scanner: CodebaseScanner;
  chunker: CodeChunker;
  indexRepository: CodebaseIndexRepository;
  memoryRepository: MemoryRepository;
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

    const previousManifest = (await this.options.indexRepository.load(projectId)) ?? createEmptyManifest(projectId, rootPath);
    const previousFiles = previousManifest.files;

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
      } else if (previous.contentHash !== hash || options.force) {
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
    manifest.createdAt = previousManifest.createdAt;
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
      const memoryIds = await this.indexFile(projectId, file);
      progress?.onFileComplete?.(file, memoryIds.length, i + 1, filesToIndex.length);
      chunksCreated += memoryIds.length;
      const hash = currentHashes.get(file.relativePath)!;
      manifest.files[file.relativePath] = createFileIndexEntry(file.relativePath, hash, memoryIds);
    }

    progress?.onSavingStart?.();

    for (const relativePath of removed) {
      const entry = previousFiles[relativePath];
      if (entry) {
        chunksRemoved += entry.memoryIds.length;
        await this.removeMemories(entry.memoryIds);
      }
    }

    await this.options.indexRepository.save(manifest);
    progress?.onSavingComplete?.();

    return { added, updated, removed, unchanged, chunksCreated, chunksRemoved };
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
    const chunkInputs = await this.options.chunker.chunk(file, content);
    const chunks = chunkInputs.map((input) => createCodeChunk(input));
    const memoryIds: string[] = [];

    for (const chunk of chunks) {
      const memoryInput = codeChunkToMemory(chunk, projectId);
      const memory = createMemory(memoryInput, chunk.id);
      await this.options.memoryRepository.save(memory);
      memoryIds.push(memory.id);

      if (await this.options.embeddingProvider.isAvailable()) {
        try {
          const text = `${memory.title}\n${memory.content}`;
          const embedding = await this.options.embeddingProvider.embed(text);
          await this.options.vectorIndex.index(memory, embedding);
        } catch (error) {
          console.warn(
            `Failed to embed chunk ${memory.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    return memoryIds;
  }

  private async removeMemories(memoryIds: string[]): Promise<void> {
    await Promise.all(
      memoryIds.map(async (id) => {
        try {
          await this.options.memoryRepository.delete(id);
        } catch (error) {
          console.warn(`Failed to delete memory ${id}: ${error instanceof Error ? error.message : String(error)}`);
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
