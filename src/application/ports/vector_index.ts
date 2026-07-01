import type { Memory } from '../../domain/memory.js';

export interface SearchResult {
  id: string;
  score: number;
}

export interface VectorIndex {
  index(memory: Memory, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
