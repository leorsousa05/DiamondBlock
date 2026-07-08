import type { Memory } from '../memory.js';
import type { Session } from '../session.js';
export interface DistillerDependencies {
    findUnprocessedSessions(limit: number): Promise<Session[]>;
    saveMemory(memory: Memory): Promise<void>;
    markSessionProcessed(sessionId: string): Promise<void>;
}
export interface DistillOptions {
    dryRun?: boolean;
    limit?: number;
}
export interface DistillResult {
    processed: number;
    memoriesCreated: number;
}
export declare class Distiller {
    private readonly deps;
    constructor(deps: DistillerDependencies);
    distill(options?: DistillOptions): Promise<DistillResult>;
    private extractMemory;
    private summarize;
    private extractTopics;
    private extractDecisions;
}
//# sourceMappingURL=distiller.d.ts.map