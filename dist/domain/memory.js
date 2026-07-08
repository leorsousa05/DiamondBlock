export function createMemory(input, id) {
    const now = new Date();
    return {
        id: id ?? generateId('mem'),
        type: input.type,
        scope: input.scope,
        title: input.title,
        content: input.content,
        createdAt: now,
        updatedAt: now,
        source: input.source ?? 'manual',
        tags: input.tags ?? [],
        confidence: input.confidence ?? 1.0,
        ...(input.summary !== undefined && { summary: input.summary }),
        ...(input.entities !== undefined && { entities: input.entities }),
    };
}
export function updateMemory(memory, updates) {
    return {
        ...memory,
        ...(updates.type && { type: updates.type }),
        ...(updates.scope && { scope: updates.scope }),
        ...(updates.title && { title: updates.title }),
        ...(updates.content && { content: updates.content }),
        ...(updates.source && { source: updates.source }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.confidence !== undefined && { confidence: updates.confidence }),
        ...(updates.summary !== undefined && { summary: updates.summary }),
        ...(updates.entities !== undefined && { entities: updates.entities }),
        updatedAt: new Date(),
    };
}
export function memoryToPlainText(memory) {
    return `${memory.title}\n\n${memory.content}`;
}
function generateId(prefix) {
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${random}`;
}
//# sourceMappingURL=memory.js.map