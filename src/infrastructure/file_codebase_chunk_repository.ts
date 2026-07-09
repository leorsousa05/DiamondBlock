import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import type {
  CodebaseChunk,
  CodebaseChunkListOptions,
  CodebaseChunkRepository,
} from '../application/ports/codebase_chunk_repository.js';
import { isNotFoundError, walkDirectory } from './file_system.js';

export interface FileCodebaseChunkRepositoryOptions {
  basePath: string;
}

interface SerializedCodebaseChunk {
  id: string;
  projectId: string;
  scope: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  title: string;
  source: string;
  tags: string[];
  confidence: number;
  metadata?: import('../application/ports/code_parser.js').ChunkMetadata;
  createdAt: string;
  updatedAt: string;
}

interface ChunkIndex {
  [chunkId: string]: string;
}

export class FileCodebaseChunkRepository implements CodebaseChunkRepository {
  private readonly chunksDir: string;
  private readonly indexPath: string;

  constructor(options: FileCodebaseChunkRepositoryOptions) {
    this.chunksDir = join(options.basePath, 'vault', 'CodebaseChunks');
    this.indexPath = join(this.chunksDir, 'chunk-index.json');
  }

  async save(chunk: CodebaseChunk): Promise<void> {
    const path = this.idToPath(chunk.id, chunk.projectId);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(this.serialize(chunk), null, 2), 'utf-8');
    await this.updateIndexEntry(chunk.id, chunk.projectId);
  }

  async findById(id: string): Promise<CodebaseChunk | null> {
    const index = await this.loadIndex();
    const projectId = index[id];

    if (projectId) {
      const path = this.idToPath(id, projectId);
      try {
        const raw = await readFile(path, 'utf-8');
        return this.deserialize(raw);
      } catch (error) {
        if (isNotFoundError(error)) {
          await this.removeIndexEntry(id);
          return this.fallbackFindById(id);
        }
        throw error;
      }
    }

    return this.fallbackFindById(id);
  }

  async delete(id: string): Promise<void> {
    const index = await this.loadIndex();
    const projectId = index[id];

    if (projectId) {
      const path = this.idToPath(id, projectId);
      try {
        await rm(path, { force: true });
      } catch {
        // ignore
      }
      await this.removeIndexEntry(id);
      return;
    }

    await this.fallbackDelete(id);
  }

  async list(options: CodebaseChunkListOptions): Promise<CodebaseChunk[]> {
    const projectDir = join(this.chunksDir, options.projectId);
    const files = await walkDirectory(projectDir);

    const chunks: CodebaseChunk[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = await readFile(file, 'utf-8');
      chunks.push(this.deserialize(raw));
    }

    chunks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    return chunks.slice(offset, offset + limit);
  }

  async purge(projectId: string): Promise<number> {
    const projectDir = join(this.chunksDir, projectId);
    const files = await walkDirectory(projectDir);
    const toDelete = files.filter((file) => file.endsWith('.json'));

    await Promise.all(toDelete.map((file) => rm(file, { force: true })));
    await this.rebuildIndex();
    return toDelete.length;
  }

  private idToPath(id: string, projectId: string): string {
    return join(this.chunksDir, projectId, `${id}.json`);
  }

  private serialize(chunk: CodebaseChunk): SerializedCodebaseChunk {
    return {
      ...chunk,
      metadata: chunk.metadata,
      createdAt: chunk.createdAt.toISOString(),
      updatedAt: chunk.updatedAt.toISOString(),
    };
  }

  private deserialize(raw: string): CodebaseChunk {
    const parsed = JSON.parse(raw) as SerializedCodebaseChunk;
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
    };
  }

  private async loadIndex(): Promise<ChunkIndex> {
    try {
      const raw = await readFile(this.indexPath, 'utf-8');
      return JSON.parse(raw) as ChunkIndex;
    } catch (error) {
      if (isNotFoundError(error)) return {};
      throw error;
    }
  }

  private async saveIndex(index: ChunkIndex): Promise<void> {
    await mkdir(this.chunksDir, { recursive: true });
    await writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  private async updateIndexEntry(chunkId: string, projectId: string): Promise<void> {
    const index = await this.loadIndex();
    index[chunkId] = projectId;
    await this.saveIndex(index);
  }

  private async removeIndexEntry(chunkId: string): Promise<void> {
    const index = await this.loadIndex();
    delete index[chunkId];
    await this.saveIndex(index);
  }

  private async rebuildIndex(): Promise<void> {
    const index: ChunkIndex = {};
    try {
      const projectDirs = await readdir(this.chunksDir, { withFileTypes: true });
      for (const entry of projectDirs) {
        if (!entry.isDirectory()) continue;
        const projectId = entry.name;
        const files = await walkDirectory(join(this.chunksDir, projectId));
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const id = basename(file, '.json');
          index[id] = projectId;
        }
      }
    } catch {
      // ignore empty or missing directory
    }
    await this.saveIndex(index);
  }

  private async fallbackFindById(id: string): Promise<CodebaseChunk | null> {
    const files = await walkDirectory(this.chunksDir);
    const match = files.find((file) => basename(file) === `${id}.json`);
    if (!match) return null;

    await this.rebuildIndex();

    const raw = await readFile(match, 'utf-8');
    return this.deserialize(raw);
  }

  private async fallbackDelete(id: string): Promise<void> {
    const files = await walkDirectory(this.chunksDir);
    const match = files.find((file) => basename(file) === `${id}.json`);
    if (match) {
      await rm(match, { force: true });
    }
    await this.rebuildIndex();
  }
}
