import type { Memory } from '../../domain/memory.js';

export interface EnrichmentResult {
  tags: string[];
  summary: string;
  entities: string[];
  confidence: number;
}

export interface EnrichmentProvider {
  enrich(memory: Memory): Promise<EnrichmentResult>;
}
