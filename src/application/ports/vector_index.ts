export interface SearchResult {
  id: string;
  score: number;
}

export interface VectorSearchOptions {
  scope?: string;
}

export interface VectorIndexable {
  id: string;
  type: string;
  scope: string;
  title: string;
  content: string;
  source: string;
}

export interface VectorIndex {
  index(item: VectorIndexable, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
