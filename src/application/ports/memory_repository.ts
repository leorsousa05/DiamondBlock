import type { Memory, MemoryType } from '../../domain/memory.js';

export interface SearchOptions {
  query?: string;
  scope?: string;
  type?: MemoryType;
  limit?: number;
  offset?: number;
}

export interface ListOptions {
  scope?: string;
  type?: MemoryType;
  limit?: number;
  offset?: number;
}

export interface MemoryRepository {
  findById(id: string): Promise<Memory | null>;
  search(options: SearchOptions): Promise<Memory[]>;
  save(memory: Memory): Promise<void>;
  delete(id: string): Promise<void>;
  list(options?: ListOptions): Promise<Memory[]>;
}
