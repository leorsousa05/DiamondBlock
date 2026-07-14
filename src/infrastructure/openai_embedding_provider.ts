import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';

export interface OpenAIEmbeddingProviderOptions {
  apiKey: string;
  model?: string;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options: OpenAIEmbeddingProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'text-embedding-3-small';
  }

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      let errorDetail: string;
      try {
        const errorBody = (await response.json()) as { error?: { message?: string; type?: string } };
        errorDetail = errorBody.error?.type ?? `status ${status}`;
      } catch {
        errorDetail = `status ${status}`;
      }
      throw new Error(`OpenAI embedding failed: ${errorDetail}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data[0]?.embedding ?? [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      let errorDetail: string;
      try {
        const errorBody = (await response.json()) as { error?: { message?: string; type?: string } };
        errorDetail = errorBody.error?.type ?? `status ${status}`;
      } catch {
        errorDetail = `status ${status}`;
      }
      throw new Error(`OpenAI embedding failed: ${errorDetail}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return data.data.map((d) => d.embedding);
  }
}
