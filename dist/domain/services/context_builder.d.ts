import type { Memory } from '../memory.js';
import type { Session } from '../session.js';
export interface ContextInput {
    sessionId: string;
    projectId: string;
    mode?: string;
    recentSessionCount?: number;
    relevantMemoryCount?: number;
    codeContextCount?: number;
}
export interface ContextOutput {
    userMemory: string;
    projectMemory: string;
    globalMemory: string;
    codeContext: string;
    recentSessions: string[];
    relevantMemories: string[];
}
export interface ContextBuilderDependencies {
    findUserMemory(): Promise<Memory | null>;
    findProjectMemory(projectId: string): Promise<Memory | null>;
    findGlobalMemories(limit: number): Promise<Memory[]>;
    findRecentSessions(projectId: string, limit: number): Promise<Session[]>;
    findRelevantMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
    findCodeMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
}
export declare class ContextBuilder {
    private readonly deps;
    constructor(deps: ContextBuilderDependencies);
    build(input: ContextInput): Promise<ContextOutput>;
    private renderMemory;
    private renderGlobalMemories;
    private renderCodeMemories;
    private renderSession;
}
//# sourceMappingURL=context_builder.d.ts.map