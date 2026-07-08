import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import YAML from 'yaml';
import { homedir } from 'node:os';
export class YamlConfigStore {
    configPath;
    constructor(options = {}) {
        this.configPath = options.configPath ?? join(homedir(), '.diamondblock', '.diamondblock.yml');
    }
    async load() {
        try {
            const raw = await readFile(this.configPath, 'utf-8');
            return YAML.parse(raw);
        }
        catch {
            return {};
        }
    }
    async save(config) {
        await mkdir(dirname(this.configPath), { recursive: true });
        await writeFile(this.configPath, YAML.stringify(config), 'utf-8');
    }
}
//# sourceMappingURL=yaml_config_store.js.map