import { execFile } from 'node:child_process';
import { resolve, sep } from 'node:path';
import { Scope } from '../domain/scope.js';
function normalizeProjectId(value) {
    return Scope.normalizeProjectId(value);
}
export class CwdProjectResolver {
    configStore;
    cwd;
    gitTimeoutMs;
    execGit;
    constructor(options = {}) {
        this.configStore = options.configStore;
        this.cwd = options.cwd === '' ? '' : options.cwd ? resolve(options.cwd) : resolve(process.cwd());
        this.gitTimeoutMs = options.gitTimeoutMs ?? 2000;
        this.execGit =
            options.execGit ??
                (async (cwd) => {
                    return new Promise((resolvePromise) => {
                        const child = execFile('git', ['rev-parse', '--show-toplevel'], { cwd, timeout: this.gitTimeoutMs, windowsHide: true }, (error, stdout) => {
                            if (error) {
                                resolvePromise(null);
                                return;
                            }
                            resolvePromise(stdout.trim() || null);
                        });
                        child.on('error', () => resolvePromise(null));
                    });
                });
    }
    async resolve(fromPath) {
        if (fromPath !== undefined && fromPath.trim().length > 0) {
            const projectId = normalizeProjectId(fromPath);
            if (projectId.length > 0) {
                return { projectId, source: 'argument' };
            }
        }
        const config = this.configStore ? await this.configStore.load() : {};
        const projectRoots = config.projectRoots;
        if (this.cwd === '') {
            return null;
        }
        if (projectRoots && Object.keys(projectRoots).length > 0) {
            const match = this.findLongestMatchingPrefix(this.cwd, projectRoots);
            if (match) {
                return { projectId: match.projectId, source: 'config' };
            }
        }
        const gitRoot = await this.execGit(this.cwd);
        if (gitRoot) {
            const projectId = normalizeProjectId(gitRoot);
            if (projectId.length > 0) {
                return { projectId, source: 'git' };
            }
        }
        const projectId = normalizeProjectId(this.cwd);
        if (projectId.length > 0) {
            return { projectId, source: 'cwd' };
        }
        return null;
    }
    findLongestMatchingPrefix(cwd, projectRoots) {
        let best = null;
        for (const [projectId, prefix] of Object.entries(projectRoots)) {
            const normalizedPrefix = resolve(prefix);
            if (cwd === normalizedPrefix || cwd.startsWith(normalizedPrefix + sep)) {
                if (!best || normalizedPrefix.length > best.prefix.length) {
                    best = { projectId, prefix: normalizedPrefix };
                }
            }
        }
        return best;
    }
}
//# sourceMappingURL=cwd_project_resolver.js.map