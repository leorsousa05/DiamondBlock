import type { ConfigStore, DiamondBlockConfig } from '../application/ports/config_store.js';
export interface YamlConfigStoreOptions {
    configPath?: string;
}
export declare class YamlConfigStore implements ConfigStore {
    private readonly configPath;
    constructor(options?: YamlConfigStoreOptions);
    load(): Promise<Partial<DiamondBlockConfig>>;
    save(config: Partial<DiamondBlockConfig>): Promise<void>;
}
//# sourceMappingURL=yaml_config_store.d.ts.map