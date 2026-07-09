function detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
        case 'mts':
        case 'cts':
            return 'typescript';
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
            return 'javascript';
        case 'json':
            return 'json';
        case 'md':
        case 'markdown':
            return 'markdown';
        case 'html':
            return 'html';
        case 'css':
            return 'css';
        case 'py':
            return 'python';
        case 'go':
            return 'go';
        case 'rs':
            return 'rust';
        case 'sh':
        case 'bash':
            return 'shell';
        case 'yml':
        case 'yaml':
            return 'yaml';
        default:
            return 'unknown';
    }
}
export class ParsingPipeline {
    options;
    constructor(options) {
        this.options = options;
    }
    async process(file, content) {
        const parser = this.options.registry.findParser(file);
        if (parser) {
            const result = await parser.parse(file, content);
            const chunks = this.options.semanticChunkBuilder.build(file, result);
            return { ...result, chunks };
        }
        const language = detectLanguage(file.relativePath);
        const fallbackChunks = this.options.fallbackChunker.chunk(file, content, { language });
        const fallbackResult = this.buildFallbackResult(file, content, fallbackChunks, language);
        const chunks = this.options.semanticChunkBuilder.build(file, fallbackResult);
        return { ...fallbackResult, chunks };
    }
    buildFallbackResult(file, _content, fallbackChunks, language) {
        return {
            language,
            parsingMode: 'fallback',
            confidence: 0.35,
            supportsGraph: false,
            supportsSymbols: false,
            symbols: [],
            relations: [],
            chunks: fallbackChunks,
        };
    }
}
//# sourceMappingURL=parsing_pipeline.js.map