export interface DiamondBlockConfig {
    vaultPath: string;
    embeddingProvider: 'local' | 'openai';
    openaiApiKey?: string;
    openaiEmbeddingModel?: string;
    heartbeatIntervalMinutes: number;
    contextWindowTokens: number;
    projectRoots?: Record<string, string>;
}
export interface ConfigStore {
    load(): Promise<Partial<DiamondBlockConfig>>;
    save(config: Partial<DiamondBlockConfig>): Promise<void>;
}
//# sourceMappingURL=config_store.d.ts.map