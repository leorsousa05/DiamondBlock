import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import type { Memory } from '../domain/memory.js';
import type { ListOptions, MemoryRepository, SearchOptions } from '../application/ports/memory_repository.js';
import { memoryToMarkdown, memoryFromMarkdown } from './markdown_serializer.js';
import { isNotFoundError, walkDirectory } from './file_system.js';

export interface FileMemoryRepositoryOptions {
  basePath: string;
}

export class FileMemoryRepository implements MemoryRepository {
  private readonly memoryDir: string;

  constructor(options: FileMemoryRepositoryOptions) {
    this.memoryDir = join(options.basePath, 'vault', 'Memory');
  }

  async findById(id: string): Promise<Memory | null> {
    const path = this.idToPath(id);
    try {
      await access(path);
      const raw = await readFile(path, 'utf-8');
      return memoryFromMarkdown(id, raw);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  async search(options: SearchOptions): Promise<Memory[]> {
    let memories = await this.listAll();

    if (options.scope) {
      memories = memories.filter((m) => m.scope === options.scope);
    }

    if (options.type) {
      memories = memories.filter((m) => m.type === options.type);
    }

    if (options.query) {
      const lower = options.query.toLowerCase();
      memories = memories.filter(
        (m) =>
          m.title.toLowerCase().includes(lower) ||
          m.content.toLowerCase().includes(lower) ||
          m.tags.some((t) => t.toLowerCase().includes(lower))
      );
    }

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    return memories.slice(offset, offset + limit);
  }

  async save(memory: Memory): Promise<void> {
    const path = this.resolvePath(memory);

    const existing = await this.findExistingPath(memory.id);
    if (existing && existing !== path) {
      await rm(existing, { force: true });
    }

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, memoryToMarkdown(memory), 'utf-8');
  }

  async delete(id: string): Promise<void> {
    const path = this.idToPath(id);
    await rm(path, { force: true });
  }

  async list(options: ListOptions = {}): Promise<Memory[]> {
    let memories = await this.listAll();

    if (options.scope) {
      memories = memories.filter((m) => m.scope === options.scope);
    }

    if (options.type) {
      memories = memories.filter((m) => m.type === options.type);
    }

    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    return memories.slice(offset, offset + limit);
  }

  resolvePath(memory: Memory): string {
    return this.idToPath(memory.id);
  }

  private idToPath(id: string): string {
    const fileName = `${id}.md`;
    return join(this.memoryDir, fileName);
  }

  private async listAll(): Promise<Memory[]> {
    const files = await walkDirectory(this.memoryDir);
    const memories: Memory[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const raw = await readFile(file, 'utf-8');
      const id = basename(file, '.md');
      memories.push(memoryFromMarkdown(id, raw));
    }

    return memories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  private async findExistingPath(id: string): Promise<string | null> {
    const files = await walkDirectory(this.memoryDir);
    return files.find((file) => file.endsWith('/' + id + '.md') || file.endsWith(id + '.md')) ?? null;
  }
}
