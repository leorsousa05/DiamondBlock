import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { YamlConfigStore } from '../infrastructure/yaml_config_store.js';

describe('YamlConfigStore', () => {
  let basePath: string;
  let configPath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-config-'));
    configPath = join(basePath, '.diamondblock.yml');
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('returns empty object when config does not exist', async () => {
    const store = new YamlConfigStore({ configPath });
    const config = await store.load();
    expect(config).toEqual({});
  });

  it('saves and loads config', async () => {
    const store = new YamlConfigStore({ configPath });
    await store.save({
      vaultPath: '/tmp/vault',
      embeddingProvider: 'openai',
      openaiApiKey: 'sk-test',
    });

    const config = await store.load();
    expect(config.vaultPath).toBe('/tmp/vault');
    expect(config.embeddingProvider).toBe('openai');
    expect(config.openaiApiKey).toBe('sk-test');
  });
});
