import { execFile } from 'node:child_process';
import { basename, resolve, sep } from 'node:path';
import { Scope } from '../domain/scope.js';
import type { ConfigStore } from '../application/ports/config_store.js';
import type { ProjectInfo, ProjectResolver } from '../application/ports/project_resolver.js';

export interface CwdProjectResolverOptions {
  configStore?: ConfigStore;
  cwd?: string;
  gitTimeoutMs?: number;
  execGit?: (cwd: string) => Promise<string | null>;
}

function normalizeProjectId(value: string): string {
  return Scope.normalizeProjectId(value);
}

export class CwdProjectResolver implements ProjectResolver {
  private readonly configStore?: ConfigStore;
  private readonly cwd: string;
  private readonly gitTimeoutMs: number;
  private readonly execGit: (cwd: string) => Promise<string | null>;

  constructor(options: CwdProjectResolverOptions = {}) {
    this.configStore = options.configStore;
    this.cwd = options.cwd === '' ? '' : options.cwd ? resolve(options.cwd) : resolve(process.cwd());
    this.gitTimeoutMs = options.gitTimeoutMs ?? 2000;
    this.execGit =
      options.execGit ??
      (async (cwd: string) => {
        return new Promise<string | null>((resolvePromise) => {
          const child = execFile(
            'git',
            ['rev-parse', '--show-toplevel'],
            { cwd, timeout: this.gitTimeoutMs, windowsHide: true },
            (error, stdout) => {
              if (error) {
                resolvePromise(null);
                return;
              }
              resolvePromise(stdout.trim() || null);
            }
          );

          child.on('error', () => resolvePromise(null));
        });
      });
  }

  async resolve(fromPath?: string): Promise<ProjectInfo | null> {
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

  private findLongestMatchingPrefix(
    cwd: string,
    projectRoots: Record<string, string>
  ): { projectId: string; prefix: string } | null {
    let best: { projectId: string; prefix: string } | null = null;

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
