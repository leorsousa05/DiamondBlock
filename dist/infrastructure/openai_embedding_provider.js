export class OpenAIEmbeddingProvider {
    apiKey;
    model;
    constructor(options) {
        this.apiKey = options.apiKey;
        this.model = options.model ?? 'text-embedding-3-small';
    }
    async isAvailable() {
        return this.apiKey.length > 0;
    }
    async embed(text) {
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
            let errorDetail;
            try {
                const errorBody = (await response.json());
                errorDetail = errorBody.error?.type ?? `status ${status}`;
            }
            catch {
                errorDetail = `status ${status}`;
            }
            throw new Error(`OpenAI embedding failed: ${errorDetail}`);
        }
        const data = (await response.json());
        return data.data[0]?.embedding ?? [];
    }
    async embedBatch(texts) {
        if (texts.length === 0)
            return [];
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
            let errorDetail;
            try {
                const errorBody = (await response.json());
                errorDetail = errorBody.error?.type ?? `status ${status}`;
            }
            catch {
                errorDetail = `status ${status}`;
            }
            throw new Error(`OpenAI embedding failed: ${errorDetail}`);
        }
        const data = (await response.json());
        return data.data.map((d) => d.embedding);
    }
}
//# sourceMappingURL=openai_embedding_provider.js.map