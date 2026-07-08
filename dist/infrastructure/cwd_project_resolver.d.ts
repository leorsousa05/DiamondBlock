import type { ConfigStore } from '../application/ports/config_store.js';
import type { ProjectInfo, ProjectResolver } from '../application/ports/project_resolver.js';
export interface CwdProjectResolverOptions {
    configStore?: ConfigStore;
    cwd?: string;
    gitTimeoutMs?: number;
    execGit?: (cwd: string) => Promise<string | null>;
}
export declare class CwdProjectResolver implements ProjectResolver {
    private readonly configStore?;
    private readonly cwd;
    private readonly gitTimeoutMs;
    private readonly execGit;
    constructor(options?: CwdProjectResolverOptions);
    resolve(fromPath?: string): Promise<ProjectInfo | null>;
    private findLongestMatchingPrefix;
}
//# sourceMappingURL=cwd_project_resolver.d.ts.map