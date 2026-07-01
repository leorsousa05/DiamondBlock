import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';
import { execFile } from 'node:child_process';
import type { McpInstaller, McpServerConfig, McpInstallResult } from '../../application/ports/mcp_installer.js';

function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32';
    const cmd = isWindows ? 'where' : 'which';
    const args = [command];

    const child = execFile(cmd, args, { windowsHide: true, timeout: 500 }, (error) => {
      resolve(error === null);
    });

    child.on('error', () => resolve(false));
  });
}

export abstract class JsonFileMcpInstaller implements McpInstaller {
  abstract readonly agent: string;
  protected abstract configPath(): string;
  protected abstract serverKey(): string;
  protected detectedCommands(): string[] {
    return [];
  }

  async isDetected(): Promise<boolean> {
    const commands = this.detectedCommands();
    const hasConfigDir = await this.configDirExists();

    if (commands.length === 0) {
      return hasConfigDir;
    }

    const commandFound = await Promise.all(commands.map((cmd) => commandExists(cmd)));
    return hasConfigDir || commandFound.some(Boolean);
  }

  private async configDirExists(): Promise<boolean> {
    try {
      await access(dirname(this.configPath()));
      return true;
    } catch {
      return false;
    }
  }

  async install(serverConfig: McpServerConfig): Promise<McpInstallResult> {
    const path = this.configPath();
    await mkdir(dirname(path), { recursive: true });

    let config: Record<string, unknown> = {};
    try {
      const raw = await readFile(path, 'utf-8');
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // file does not exist or is invalid; start fresh
    }

    const mcpServers = (config.mcpServers as Record<string, McpServerConfig>) ?? {};
    mcpServers[this.serverKey()] = serverConfig;
    config.mcpServers = mcpServers;

    await writeFile(path, JSON.stringify(config, null, 2), 'utf-8');

    return {
      agent: this.agent,
      installed: true,
      configPath: path,
      message: `Installed ${this.agent} MCP server`,
    };
  }
}

export class KimiMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'kimi';
  protected configPath(): string {
    return join(homedir(), '.kimi', 'mcp.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['kimi'];
  }
}

export class KimiCodeMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'kimi-code';
  protected configPath(): string {
    return join(homedir(), '.kimi-code', 'mcp.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['kimi-code'];
  }
}

export class ClaudeMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'claude';
  protected configPath(): string {
    return join(homedir(), '.claude', 'claude_desktop_config.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['claude'];
  }
}

export class CodexMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'codex';
  protected configPath(): string {
    return join(homedir(), '.codex', 'mcp.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['codex'];
  }
}

export class AgyMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'agy';
  protected configPath(): string {
    return join(homedir(), '.gemini', 'config', 'mcp_config.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['agy', 'gemini'];
  }
}

export class CursorMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'cursor';
  protected configPath(): string {
    return join(homedir(), '.cursor', 'mcp.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['cursor'];
  }
}

export class WindsurfMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'windsurf';
  protected configPath(): string {
    return join(homedir(), '.codeium', 'windsurf', 'mcp_config.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['windsurf'];
  }
}

export class ClineMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'cline';
  protected configPath(): string {
    return join(homedir(), '.cline', 'mcp.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['cline'];
  }
}

export class ContinueMcpInstaller extends JsonFileMcpInstaller {
  readonly agent = 'continue';
  protected configPath(): string {
    return join(homedir(), '.continue', 'config.json');
  }
  protected serverKey(): string {
    return 'diamondblock';
  }
  protected detectedCommands(): string[] {
    return ['continue'];
  }
}

export function createDefaultInstallers(): McpInstaller[] {
  return [
    new KimiMcpInstaller(),
    new KimiCodeMcpInstaller(),
    new ClaudeMcpInstaller(),
    new CodexMcpInstaller(),
    new AgyMcpInstaller(),
    new CursorMcpInstaller(),
    new WindsurfMcpInstaller(),
    new ClineMcpInstaller(),
    new ContinueMcpInstaller(),
  ];
}
