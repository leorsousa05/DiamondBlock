import type { McpInstaller, McpServerConfig, McpInstallResult } from '../../application/ports/mcp_installer.js';
export declare abstract class JsonFileMcpInstaller implements McpInstaller {
    abstract readonly agent: string;
    protected abstract configPath(): string;
    protected abstract serverKey(): string;
    getConfigPath(): string;
    protected detectedCommands(): string[];
    isDetected(): Promise<boolean>;
    private configDirExists;
    install(serverConfig: McpServerConfig): Promise<McpInstallResult>;
}
export declare class KimiMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "kimi";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class KimiCodeMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "kimi-code";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class ClaudeMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "claude";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class CodexMcpInstaller implements McpInstaller {
    readonly agent = "codex";
    protected configPath(): string;
    getConfigPath(): string;
    private configDirExists;
    isDetected(): Promise<boolean>;
    install(serverConfig: McpServerConfig): Promise<McpInstallResult>;
}
export declare class AgyMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "agy";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class CursorMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "cursor";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class WindsurfMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "windsurf";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class ClineMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "cline";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare class ContinueMcpInstaller extends JsonFileMcpInstaller {
    readonly agent = "continue";
    protected configPath(): string;
    protected serverKey(): string;
    protected detectedCommands(): string[];
}
export declare function createDefaultInstallers(): McpInstaller[];
//# sourceMappingURL=json_file_installer.d.ts.map