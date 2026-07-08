import type { MemoryType } from './memory.js';
export type ScopePrefix = 'user' | 'global' | 'project';
export interface ScopeInfo {
    prefix: ScopePrefix;
    projectId?: string;
    raw: string;
}
export declare class Scope {
    static readonly USER = "user";
    static readonly GLOBAL = "global";
    static readonly PROJECT_PREFIX = "project";
    static normalize(scope: string): string;
    static normalizeProjectId(projectId: string): string;
    static fromTypeAndProject(type: MemoryType, projectId?: string): string;
    static parse(scope: string): ScopeInfo;
    static isProject(scope: string): boolean;
    static projectIdFromScope(scope: string): string | undefined;
}
//# sourceMappingURL=scope.d.ts.map