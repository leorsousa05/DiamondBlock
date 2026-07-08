export interface ProjectInfo {
    projectId: string;
    source: 'cwd' | 'git' | 'config' | 'argument';
}
export interface ProjectResolver {
    resolve(fromPath?: string): Promise<ProjectInfo | null>;
}
//# sourceMappingURL=project_resolver.d.ts.map