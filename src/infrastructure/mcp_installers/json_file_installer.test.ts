import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { InstallMcpUseCase } from '../../application/use_cases/install_mcp.js';
import {
  KimiMcpInstaller,
  KimiCodeMcpInstaller,
  CursorMcpInstaller,
  createDefaultInstallers,
} from './json_file_installer.js';
import { readFile } from 'node:fs/promises';

describe('InstallMcpUseCase', () => {
  let basePath: string;
  let configPath: string;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-install-'));
    configPath = join(basePath, '.kimi', 'mcp.json');
    mkdirSync(dirname(configPath), { recursive: true });
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('installs mcp config for detected agent', async () => {
    const installer = new KimiMcpInstaller();
    (installer as unknown as { configPath: () => string }).configPath = () => configPath;

    const useCase = new InstallMcpUseCase([installer]);
    const results = await useCase.execute({
      serverConfig: {
        command: 'node',
        args: ['/path/to/server.js'],
        env: { DB_HOME: '/tmp/vault' },
      },
    });

    expect(results.length).toBe(1);
    expect(results[0]?.installed).toBe(true);

    const raw = await readFile(configPath, 'utf-8');
    const config = JSON.parse(raw);
    expect(config.mcpServers.diamondblock).toEqual({
      command: 'node',
      args: ['/path/to/server.js'],
      env: { DB_HOME: '/tmp/vault' },
    });
  });

  it('installs mcp config for kimi-code agent', async () => {
    const kimiCodeConfigPath = join(basePath, '.kimi-code', 'mcp.json');
    mkdirSync(dirname(kimiCodeConfigPath), { recursive: true });

    const installer = new KimiCodeMcpInstaller();
    (installer as unknown as { configPath: () => string }).configPath = () => kimiCodeConfigPath;

    const useCase = new InstallMcpUseCase([installer]);
    const results = await useCase.execute({
      serverConfig: {
        command: 'node',
        args: ['/path/to/server.js'],
        env: { DB_HOME: '/tmp/vault' },
      },
    });

    expect(results.length).toBe(1);
    expect(results[0]?.installed).toBe(true);

    const raw = await readFile(kimiCodeConfigPath, 'utf-8');
    const config = JSON.parse(raw);
    expect(config.mcpServers.diamondblock).toEqual({
      command: 'node',
      args: ['/path/to/server.js'],
      env: { DB_HOME: '/tmp/vault' },
    });
  });

  it('installs mcp config for cursor agent', async () => {
    const cursorConfigPath = join(basePath, '.cursor', 'mcp.json');
    mkdirSync(dirname(cursorConfigPath), { recursive: true });

    const installer = new CursorMcpInstaller();
    (installer as unknown as { configPath: () => string }).configPath = () => cursorConfigPath;

    const useCase = new InstallMcpUseCase([installer]);
    const results = await useCase.execute({
      serverConfig: {
        command: 'node',
        args: ['/path/to/server.js'],
      },
    });

    expect(results[0]?.installed).toBe(true);

    const raw = await readFile(cursorConfigPath, 'utf-8');
    const config = JSON.parse(raw);
    expect(config.mcpServers.diamondblock).toEqual({
      command: 'node',
      args: ['/path/to/server.js'],
    });
  });

  it('does not modify files in dry run mode', async () => {
    const installer = new KimiMcpInstaller();
    (installer as unknown as { configPath: () => string }).configPath = () => configPath;

    const useCase = new InstallMcpUseCase([installer]);
    const results = await useCase.execute({
      serverConfig: {
        command: 'node',
        args: ['/path/to/server.js'],
      },
      dryRun: true,
    });

    expect(results[0]?.installed).toBe(false);
    expect(results[0]?.message).toContain('Would install');
  });

  it('respects target option', async () => {
    const useCase = new InstallMcpUseCase(createDefaultInstallers());
    const results = await useCase.execute({
      serverConfig: {
        command: 'node',
        args: ['/path/to/server.js'],
      },
      target: 'kimi',
    });

    expect(results.length).toBe(1);
    expect(results[0]?.agent).toBe('kimi');
  });
});
