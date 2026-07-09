import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CodebaseIndexManifest,
  CodebaseIndexRepository,
  FileIndexEntry,
} from '../application/ports/codebase_index_repository.js';

export interface FileCodebaseIndexRepositoryOptions {
  basePath: string;
}

export class FileCodebaseIndexRepository implements CodebaseIndexRepository {
  private readonly indexDir: string;

  constructor(options: FileCodebaseIndexRepositoryOptions) {
    this.indexDir = join(options.basePath, 'vault', 'CodebaseIndex');
  }

  async load(projectId: string): Promise<CodebaseIndexManifest | null> {
    const path = this.manifestPath(projectId);
    try {
      const raw = await readFile(path, 'utf-8');
      const parsed = JSON.parse(raw) as CodebaseIndexManifest;
      return {
        ...parsed,
        files: parsed.files ?? {},
      };
    } catch (error) {
      if (this.isNotFoundError(error)) return null;
      throw error;
    }
  }

  async save(manifest: CodebaseIndexManifest): Promise<void> {
    const path = this.manifestPath(manifest.projectId);
    await mkdir(path.split('/').slice(0, -1).join('/'), { recursive: true });
    await writeFile(path, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  async delete(projectId: string): Promise<void> {
    const path = this.manifestPath(projectId);
    await rm(path, { force: true });
  }

  private manifestPath(projectId: string): string {
    return join(this.indexDir, `${projectId}.json`);
  }

  private isNotFoundError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
  }
}

export function createEmptyManifest(projectId: string, rootPath: string): CodebaseIndexManifest {
  const now = new Date().toISOString();
  return {
    projectId,
    rootPath,
    createdAt: now,
    updatedAt: now,
    files: {},
  };
}

export function createFileIndexEntry(
  relativePath: string,
  contentHash: string,
  chunkIds: string[]
): FileIndexEntry {
  return {
    relativePath,
    contentHash,
    indexedAt: new Date().toISOString(),
    chunkIds,
  };
}
