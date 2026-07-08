import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';
import { execFile } from 'node:child_process';
function commandExists(command) {
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
export class JsonFileMcpInstaller {
    detectedCommands() {
        return [];
    }
    async isDetected() {
        const commands = this.detectedCommands();
        const hasConfigDir = await this.configDirExists();
        if (commands.length === 0) {
            return hasConfigDir;
        }
        const commandFound = await Promise.all(commands.map((cmd) => commandExists(cmd)));
        return hasConfigDir || commandFound.some(Boolean);
    }
    async configDirExists() {
        try {
            await access(dirname(this.configPath()));
            return true;
        }
        catch {
            return false;
        }
    }
    async install(serverConfig) {
        const path = this.configPath();
        await mkdir(dirname(path), { recursive: true });
        let config = {};
        try {
            const raw = await readFile(path, 'utf-8');
            config = JSON.parse(raw);
        }
        catch {
            // file does not exist or is invalid; start fresh
        }
        const mcpServers = config.mcpServers ?? {};
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
    agent = 'kimi';
    configPath() {
        return join(homedir(), '.kimi', 'mcp.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['kimi'];
    }
}
export class KimiCodeMcpInstaller extends JsonFileMcpInstaller {
    agent = 'kimi-code';
    configPath() {
        return join(homedir(), '.kimi-code', 'mcp.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['kimi-code'];
    }
}
export class ClaudeMcpInstaller extends JsonFileMcpInstaller {
    agent = 'claude';
    configPath() {
        return join(homedir(), '.claude', 'claude_desktop_config.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['claude'];
    }
}
export class CodexMcpInstaller extends JsonFileMcpInstaller {
    agent = 'codex';
    configPath() {
        return join(homedir(), '.codex', 'mcp.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['codex'];
    }
}
export class AgyMcpInstaller extends JsonFileMcpInstaller {
    agent = 'agy';
    configPath() {
        return join(homedir(), '.gemini', 'config', 'mcp_config.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['agy', 'gemini'];
    }
}
export class CursorMcpInstaller extends JsonFileMcpInstaller {
    agent = 'cursor';
    configPath() {
        return join(homedir(), '.cursor', 'mcp.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['cursor'];
    }
}
export class WindsurfMcpInstaller extends JsonFileMcpInstaller {
    agent = 'windsurf';
    configPath() {
        return join(homedir(), '.codeium', 'windsurf', 'mcp_config.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['windsurf'];
    }
}
export class ClineMcpInstaller extends JsonFileMcpInstaller {
    agent = 'cline';
    configPath() {
        return join(homedir(), '.cline', 'mcp.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['cline'];
    }
}
export class ContinueMcpInstaller extends JsonFileMcpInstaller {
    agent = 'continue';
    configPath() {
        return join(homedir(), '.continue', 'config.json');
    }
    serverKey() {
        return 'diamondblock';
    }
    detectedCommands() {
        return ['continue'];
    }
}
export function createDefaultInstallers() {
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
//# sourceMappingURL=json_file_installer.js.map