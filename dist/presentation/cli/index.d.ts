#!/usr/bin/env node
import type { MemoryType } from '../../domain/memory.js';
export declare function resolveAddMemoryType(options: {
    type?: string;
    project?: string;
}): MemoryType;
export declare function resolveAddMemoryScope(type: MemoryType, options: {
    scope?: string;
    project?: string;
}, resolveProjectFn: () => Promise<{
    projectId: string;
    source: string;
}>): Promise<{
    scope: string;
    projectId?: string;
}>;
//# sourceMappingURL=index.d.ts.map