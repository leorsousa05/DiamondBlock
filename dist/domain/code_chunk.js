function generateChunkId(filePath, startLine) {
    const seed = `${filePath}:${startLine}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    const suffix = Math.abs(hash).toString(36).padStart(8, '0');
    return `chunk_${suffix}`;
}
export function createCodeChunk(input) {
    return {
        id: generateChunkId(input.filePath, input.startLine),
        filePath: input.filePath,
        startLine: input.startLine,
        endLine: input.endLine,
        language: input.language,
        content: input.content,
    };
}
export function codeChunkToMemory(chunk, projectId) {
    const lines = chunk.content.split('\n');
    const title = lines[0]?.trim() ?? `Code chunk from ${chunk.filePath}`;
    return {
        type: 'knowledge',
        scope: `project/${projectId}`,
        title,
        content: chunk.content,
        source: 'codebase-indexer',
        tags: ['code', 'chunk', chunk.language || 'unknown'],
        confidence: 1.0,
    };
}
export function memoryToCodeChunkTitle(chunk) {
    return `// file: ${chunk.filePath} lines ${chunk.startLine}-${chunk.endLine}`;
}
//# sourceMappingURL=code_chunk.js.map