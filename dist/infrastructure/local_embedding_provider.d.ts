import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';
export declare class LocalEmbeddingProvider implements EmbeddingProvider {
    private readonly model;
    private extractor;
    constructor(model?: string);
    isAvailable(): Promise<boolean>;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    private getExtractor;
}
//# sourceMappingURL=local_embedding_provider.d.ts.map