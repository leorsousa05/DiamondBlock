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

  private async getExtractor(): Promise<FeatureExtractionPipeline> {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', this.model);
    }
    return this.extractor;
  }
}
