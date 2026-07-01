import type { McpInstaller, McpServerConfig, McpInstallResult } from '../ports/mcp_installer.js';

export interface InstallMcpInput {
  serverConfig: McpServerConfig;
  target?: string;
  dryRun?: boolean;
}

export class InstallMcpUseCase {
  constructor(private readonly installers: McpInstaller[]) {}

  async execute(input: InstallMcpInput): Promise<McpInstallResult[]> {
    const installers = input.target
      ? this.installers.filter((i) => i.agent === input.target)
      : this.installers;

    const results: McpInstallResult[] = [];

    for (const installer of installers) {
      const detected = await installer.isDetected();
      if (!detected) {
        results.push({
          agent: installer.agent,
          installed: false,
          configPath: '',
          message: `${installer.agent} not detected`,
        });
        continue;
      }

      if (input.dryRun) {
        results.push({
          agent: installer.agent,
          installed: false,
          configPath: '',
          message: `Would install for ${installer.agent}`,
        });
        continue;
      }

      const result = await installer.install(input.serverConfig);
      results.push(result);
    }

    return results;
  }
}
