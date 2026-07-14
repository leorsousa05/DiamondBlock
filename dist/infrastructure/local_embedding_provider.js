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
    async embedBatch(texts) {
        if (texts.length === 0)
            return [];
        const extractor = await this.getExtractor();
        const output = await extractor(texts, { pooling: 'mean', normalize: true });
        const size = output.dims[1];
        const data = output.data;
        const result = [];
        for (let i = 0; i < texts.length; i++) {
            const start = i * size;
            const end = start + size;
            result.push(Array.from(data.slice(start, end)));
        }
        return result;
    }
    async getExtractor() {
        if (!this.extractor) {
            this.extractor = await pipeline('feature-extraction', this.model);
        }
        return this.extractor;
    }
}
//# sourceMappingURL=local_embedding_provider.js.map