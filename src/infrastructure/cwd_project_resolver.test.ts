import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CwdProjectResolver } from '../infrastructure/cwd_project_resolver.js';
import type { ConfigStore, DiamondBlockConfig } from '../application/ports/config_store.js';

class InMemoryConfigStore implements ConfigStore {
  constructor(private readonly config: Partial<DiamondBlockConfig> = {}) {}

  async load(): Promise<Partial<DiamondBlockConfig>> {
    return this.config;
  }

  async save(): Promise<void> {}
}

describe('CwdProjectResolver', () => {
  let basePath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-resolver-'));
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('resolves project from directory name', async () => {
    const cwd = join(basePath, 'My Project');
    const resolver = new CwdProjectResolver({ cwd });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'my-project', source: 'cwd' });
  });

  it('resolves project from git root when available', async () => {
    const cwd = join(basePath, 'repo', 'src');
    const resolver = new CwdProjectResolver({
      cwd,
      execGit: async () => join(basePath, 'My Repo'),
    });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'my-repo', source: 'git' });
  });

  it('falls back to directory name when git fails', async () => {
    const cwd = join(basePath, 'fallback-project');
    const resolver = new CwdProjectResolver({
      cwd,
      execGit: async () => null,
    });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'fallback-project', source: 'cwd' });
  });

  it('resolves project from config projectRoots when cwd is under prefix', async () => {
    const cwd = join(basePath, 'work', 'client-a', 'src');
    const configStore = new InMemoryConfigStore({
      projectRoots: {
        'client-a': join(basePath, 'work', 'client-a'),
        'work': basePath,
      },
    });
    const resolver = new CwdProjectResolver({ cwd, configStore });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'client-a', source: 'config' });
  });

  it('prefers the longest matching config prefix', async () => {
    const cwd = join(basePath, 'work', 'client-a', 'src');
    const configStore = new InMemoryConfigStore({
      projectRoots: {
        'client-a': join(basePath, 'work', 'client-a'),
        'client-a-src': join(basePath, 'work', 'client-a', 'src'),
      },
    });
    const resolver = new CwdProjectResolver({ cwd, configStore });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'client-a-src', source: 'config' });
  });

  it('gives argument precedence over config', async () => {
    const cwd = join(basePath, 'work', 'client-a');
    const configStore = new InMemoryConfigStore({
      projectRoots: {
        'client-a': join(basePath, 'work', 'client-a'),
      },
    });
    const resolver = new CwdProjectResolver({ cwd, configStore });

    const result = await resolver.resolve('explicit-project');

    expect(result).toEqual({ projectId: 'explicit-project', source: 'argument' });
  });

  it('gives config precedence over git', async () => {
    const cwd = join(basePath, 'repo');
    const configStore = new InMemoryConfigStore({
      projectRoots: {
        'configured-project': cwd,
      },
    });
    const resolver = new CwdProjectResolver({
      cwd,
      configStore,
      execGit: async () => join(basePath, 'git-project'),
    });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'configured-project', source: 'config' });
  });

  it('gives git precedence over directory name', async () => {
    const cwd = join(basePath, 'repo');
    const resolver = new CwdProjectResolver({
      cwd,
      execGit: async () => join(basePath, 'git-project'),
    });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'git-project', source: 'git' });
  });

  it('normalizes project ids to kebab-case', async () => {
    const cwd = join(basePath, 'My--Weird__Project!');
    const resolver = new CwdProjectResolver({ cwd });

    const result = await resolver.resolve();

    expect(result).toEqual({ projectId: 'my-weird-project', source: 'cwd' });
  });

  it('normalizes explicit path by basename', async () => {
    const resolver = new CwdProjectResolver({ cwd: basePath });

    const result = await resolver.resolve('/some/path/My-App');

    expect(result).toEqual({ projectId: 'my-app', source: 'argument' });
  });

  it('returns null when cwd is empty and no fallback is available', async () => {
    const resolver = new CwdProjectResolver({
      cwd: '',
      execGit: async () => null,
    });

    const result = await resolver.resolve();

    expect(result).toBeNull();
  });

  it('uses resolved absolute cwd for config prefix matching', async () => {
    const relativeCwd = '.';
    const configStore = new InMemoryConfigStore({
      projectRoots: {
        'current-dir': resolve(relativeCwd),
      },
    });
    const resolver = new CwdProjectResolver({
      cwd: relativeCwd,
      configStore,
      execGit: async () => null,
    });

    const result = await resolver.resolve();

    expect(result?.source).toBe('config');
    expect(result?.projectId).toBe('current-dir');
  });
});
