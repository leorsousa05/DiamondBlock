import { pipeline } from '@xenova/transformers';
export class LocalEmbeddingProvider {
    model;
    extractor = null;
    constructor(model = 'Xenova/all-MiniLM-L6-v2') {
        this.model = model;
    }
    async isAvailable() {
        try {
            await this.getExtractor();
            return true;
        }
        catch (error) {
            console.error(`Local embedding provider unavailable: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    async embed(text) {
        const extractor = await this.getExtractor();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }
    async getExtractor() {
        if (!this.extractor) {
            this.extractor = await pipeline('feature-extraction', this.model);
        }
        return this.extractor;
    }
}
//# sourceMappingURL=local_embedding_provider.js.map