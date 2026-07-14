import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';

export class LocalEmbeddingProvider implements EmbeddingProvider {
  private extractor: FeatureExtractionPipeline | null = null;

  constructor(private readonly model = 'Xenova/all-MiniLM-L6-v2') {}

  async isAvailable(): Promise<boolean> {
    try {
      await this.getExtractor();
      return true;
    } catch (error) {
      console.error(`Local embedding provider unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extractor = await this.getExtractor();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    const size = output.dims[1];
    const data = output.data;
    const result: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const start = i * size;
      const end = start + size;
      result.push(Array.from(data.slice(start, end)) as number[]);
    }
    return result;
  }

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.model);
    }
    return this.extractor;
  }
}
