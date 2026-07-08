export type MemoryType = 'user' | 'project' | 'knowledge' | 'distilled';
export interface Memory {
    id: string;
    type: MemoryType;
    scope: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    source: string;
    tags: string[];
    confidence: number;
    summary?: string;
    entities?: string[];
}
export interface MemoryInput {
    type: MemoryType;
    scope: string;
    title: string;
    content: string;
    source?: string;
    tags?: string[];
    confidence?: number;
    summary?: string;
    entities?: string[];
}
export declare function createMemory(input: MemoryInput, id?: string): Memory;
export declare function updateMemory(memory: Memory, updates: Partial<MemoryInput>): Memory;
export declare function memoryToPlainText(memory: Memory): string;
//# sourceMappingURL=memory.d.ts.map