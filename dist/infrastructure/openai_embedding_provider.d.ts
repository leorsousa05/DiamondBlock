import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';
export interface OpenAIEmbeddingProviderOptions {
    apiKey: string;
    model?: string;
}
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    private readonly apiKey;
    private readonly model;
    constructor(options: OpenAIEmbeddingProviderOptions);
    isAvailable(): Promise<boolean>;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
//# sourceMappingURL=openai_embedding_provider.d.ts.map