export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    isAvailable(): Promise<boolean>;
}
//# sourceMappingURL=embedding_provider.d.ts.map