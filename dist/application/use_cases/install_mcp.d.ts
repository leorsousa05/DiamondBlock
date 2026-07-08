import type { McpInstaller, McpServerConfig, McpInstallResult } from '../ports/mcp_installer.js';
export interface InstallMcpInput {
    serverConfig: McpServerConfig;
    target?: string;
    dryRun?: boolean;
}
export declare class InstallMcpUseCase {
    private readonly installers;
    constructor(installers: McpInstaller[]);
    execute(input: InstallMcpInput): Promise<McpInstallResult[]>;
}
//# sourceMappingURL=install_mcp.d.ts.map