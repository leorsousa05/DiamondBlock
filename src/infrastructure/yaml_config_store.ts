import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import YAML from 'yaml';
import type { ConfigStore, DiamondBlockConfig } from '../application/ports/config_store.js';
import { homedir } from 'node:os';

export interface YamlConfigStoreOptions {
  configPath?: string;
}

export class YamlConfigStore implements ConfigStore {
  private readonly configPath: string;

  constructor(options: YamlConfigStoreOptions = {}) {
    this.configPath = options.configPath ?? join(homedir(), '.diamondblock', '.diamondblock.yml');
  }

  async load(): Promise<Partial<DiamondBlockConfig>> {
    try {
      const raw = await readFile(this.configPath, 'utf-8');
      return YAML.parse(raw) as Partial<DiamondBlockConfig>;
    } catch {
      return {};
    }
  }

  async save(config: Partial<DiamondBlockConfig>): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true });
    await writeFile(this.configPath, YAML.stringify(config), 'utf-8');
  }
}
