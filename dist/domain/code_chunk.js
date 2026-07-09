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
        metadata: input.metadata,
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
        confidence: chunk.metadata?.confidence ?? 1.0,
    };
}
export function memoryToCodeChunkTitle(chunk) {
    return `// file: ${chunk.filePath} lines ${chunk.startLine}-${chunk.endLine}`;
}
export function createCodebaseChunkFromCodeChunk(chunk, projectId) {
    const lines = chunk.content.split('\n');
    const title = lines[0]?.trim() ?? `Code chunk from ${chunk.filePath}`;
    return {
        id: chunk.id,
        projectId,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        language: chunk.language,
        content: chunk.content,
        title,
        source: 'codebase-indexer',
        tags: ['code', 'chunk', chunk.language || 'unknown'],
        confidence: chunk.metadata?.confidence ?? 1.0,
        metadata: chunk.metadata,
    };
}
//# sourceMappingURL=code_chunk.js.map