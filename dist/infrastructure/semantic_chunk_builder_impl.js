export class SemanticChunkBuilderImpl {
    build(file, result) {
        return result.chunks.map((chunk) => this.buildChunk(file, result, chunk));
    }
    buildChunk(file, result, chunk) {
        const metadata = chunk.metadata ?? {
            parsingMode: result.parsingMode,
            confidence: result.confidence,
            supportsGraph: result.supportsGraph,
            supportsSymbols: result.supportsSymbols,
            language: result.language,
            imports: [],
            symbolIds: [],
        };
        const header = this.buildHeader(file, chunk, metadata);
        const body = this.stripExistingHeader(chunk.content);
        const importBlock = metadata.imports.length > 0 ? `${metadata.imports.join('\n')}\n\n` : '';
        const content = `${header}\n${importBlock}${body}`;
        return {
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            language: chunk.language,
            content,
            metadata,
        };
    }
    buildHeader(file, chunk, metadata) {
        const symbolHint = metadata.symbolIds.length > 0 ? ` symbols: ${metadata.symbolIds.join(', ')}` : '';
        return `// file: ${file.relativePath} lines ${chunk.startLine}-${chunk.endLine}${symbolHint}`;
    }
    stripExistingHeader(content) {
        return content;
    }
}
//# sourceMappingURL=semantic_chunk_builder_impl.js.map