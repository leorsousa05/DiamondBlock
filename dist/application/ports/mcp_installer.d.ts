export interface McpServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}
export interface McpInstallResult {
    agent: string;
    installed: boolean;
    configPath: string;
    message: string;
}
export interface McpInstaller {
    readonly agent: string;
    isDetected(): Promise<boolean>;
    install(serverConfig: McpServerConfig): Promise<McpInstallResult>;
}
//# sourceMappingURL=mcp_installer.d.ts.map