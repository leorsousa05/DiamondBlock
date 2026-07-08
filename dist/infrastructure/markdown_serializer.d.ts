import type { Memory, MemoryType } from '../domain/memory.js';
export interface MemoryFrontmatter {
    id: string;
    type: MemoryType;
    scope: string;
    created_at: string;
    updated_at: string;
    source: string;
    tags?: string[];
    confidence?: number;
    summary?: string;
    entities?: string[];
}
export declare function memoryToMarkdown(memory: Memory): string;
export declare function memoryFromMarkdown(id: string, raw: string): Memory;
export declare function sessionToMarkdown(session: {
    id: string;
    projectId: string;
    createdAt: Date;
    messages: Array<{
        role: string;
        content: string;
        timestamp: Date;
    }>;
}): string;
export declare function parseSessionFromMarkdown(id: string, raw: string): {
    id: string;
    projectId: string;
    createdAt: Date;
    processed: boolean;
    messages: Array<{
        role: string;
        content: string;
        timestamp: Date;
    }>;
};
//# sourceMappingURL=markdown_serializer.d.ts.map