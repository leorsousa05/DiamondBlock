#!/usr/bin/env node
import { startWebServer } from '../web/server.js';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { setContainer } from '../../container.js';
import { initializeVault, defaultVaultPath } from '../../infrastructure/vault_initializer.js';
import { FileMemoryRepository } from '../../infrastructure/file_memory_repository.js';
import { FileCodebaseChunkRepository } from '../../infrastructure/file_codebase_chunk_repository.js';
import { FileSessionRepository } from '../../infrastructure/file_session_repository.js';
import { SqliteVectorIndex } from '../../infrastructure/sqlite_vector_index.js';
import { createDefaultContainer } from '../../container_factory.js';
import { SaveMemoryUseCase } from '../../application/use_cases/save_memory.js';
import { SearchMemoryUseCase } from '../../application/use_cases/search_memory.js';
import { DeleteMemoryUseCase } from '../../application/use_cases/delete_memory.js';
import { DistillSessionsUseCase } from '../../application/use_cases/distill_sessions.js';
import { memoryToMarkdown, memoryFromMarkdown } from '../../infrastructure/markdown_serializer.js';
import { UpdateMemoryUseCase } from '../../application/use_cases/update_memory.js';
import { IndexCodebaseUseCase } from '../../application/use_cases/index_codebase.js';
import { Scope } from '../../domain/scope.js';

import type { ProjectResolver } from '../../application/ports/project_resolver.js';

const program = new Command();

const packageJsonPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'package.json'
);

const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as { version: string };

program
  .name('diamondblock')
  .description('DiamondBlock — local AI memory')
  .version(packageJson.version)
  .option('--vault <path>', 'path to DiamondBlock vault');

async function loadContainer(vaultPath?: string) {
  if (!vaultPath) {
    vaultPath = program.opts().vault;
  }
  const container = await createDefaultContainer(vaultPath);
  setContainer(container);

  const config = await container.configStore.load();
  const basePath = vaultPath ?? config.vaultPath ?? defaultVaultPath();

  return { ...container, basePath };
}

async function resolveProject(
  projectResolver: ProjectResolver,
  explicitProject?: string
): Promise<{ projectId: string; source: string }> {
  const info = await projectResolver.resolve(explicitProject);
  if (!info) {
    throw new Error('Could not resolve project');
  }
  return info;
}

program
  .command('init [path]')
  .description('Initialize a new DiamondBlock vault')
  .action(async (path?: string) => {
    const vaultPath = path ?? defaultVaultPath();
    const spinner = ora(`Initializing vault at ${vaultPath}`).start();

    try {
      await initializeVault({ vaultPath, createSample: true });
      spinner.succeed(`Vault initialized at ${chalk.cyan(vaultPath)}`);
      console.log(chalk.gray('Run `diamondblock memory add` to create your first memory.'));
    } catch (error) {
      spinner.fail(`Failed to initialize vault: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

const memoryCmd = program.command('memory').description('Manage memories');

memoryCmd
  .command('list')
  .description('List memories')
  .option('--scope <scope>')
  .option('--project <projectId>', 'project id (alias for --scope project/<id>; auto-detected when omitted)')
  .option('--limit <limit>', 'number of memories', '20')
  .action(async (options) => {
    const { basePath, projectResolver } = await loadContainer();
    const repo = new FileMemoryRepository({ basePath });

    let scope: string | undefined;
    if (options.scope) {
      scope = options.scope;
    } else {
      const project = options.project
        ? await resolveProject(projectResolver, options.project)
        : await resolveProject(projectResolver);
      console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));
      scope = `project/${project.projectId}`;
    }

    const memories = await repo.list({
      scope,
      limit: parseInt(options.limit, 10),
    });

    const table = new Table({
      head: [chalk.bold('ID'), chalk.bold('Type'), chalk.bold('Scope'), chalk.bold('Title')],
      colWidths: [24, 12, 24, 40],
    });

    for (const memory of memories) {
      table.push([memory.id, memory.type, memory.scope, memory.title]);
    }

    console.log(table.toString());
  });

memoryCmd
  .command('search <query>')
  .description('Search memories by semantic meaning')
  .option('--scope <scope>')
  .option('--project <projectId>', 'project id (alias for --scope project/<id>; auto-detected when omitted)')
  .option('--limit <limit>', 'number of results', '5')
  .action(async (query: string, options) => {
    const { basePath, embeddingProvider, projectResolver } = await loadContainer();
    const spinner = ora('Searching memories').start();

    try {
      const repo = new FileMemoryRepository({ basePath });
      const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });

      let scope: string | undefined;
      if (options.scope) {
        scope = options.scope;
      } else {
        const project = options.project
          ? await resolveProject(projectResolver, options.project)
          : await resolveProject(projectResolver);
        console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));
        scope = `project/${project.projectId}`;
      }

      const useCase = new SearchMemoryUseCase(repo, vectorIndex, embeddingProvider);
      const results = await useCase.execute({
        query,
        scope,
        limit: parseInt(options.limit, 10),
      });

      spinner.stop();

      if (results.length === 0) {
        console.log(chalk.yellow('No memories found.'));
        return;
      }

      const table = new Table({
        head: [chalk.bold('Score'), chalk.bold('ID'), chalk.bold('Title'), chalk.bold('Scope'), chalk.bold('Path')],
        colWidths: [10, 24, 30, 20, 30],
      });

      for (const result of results) {
        table.push([
          result.score.toFixed(3),
          result.id,
          result.title,
          result.scope,
          result.path,
        ]);
      }

      console.log(table.toString());
    } catch (error) {
      spinner.fail(`Search failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

memoryCmd
  .command('add')
  .description('Add a new memory')
  .requiredOption('--title <title>')
  .option('--type <type>', 'memory type', 'knowledge')
  .option('--scope <scope>', 'memory scope')
  .option('--project <projectId>', 'project id (derives scope when --scope is omitted; auto-detected when omitted)')
  .option('--content <content>')
  .option('--tag <tag>', 'tags', [])
  .action(async (options) => {
    const { basePath, embeddingProvider, enrichmentService, projectResolver } = await loadContainer();
    const tags = Array.isArray(options.tag) ? options.tag : [options.tag].filter(Boolean);

    let scope: string;
    let projectId: string | undefined;
    if (options.scope) {
      scope = Scope.normalize(options.scope);
    } else if (options.project) {
      projectId = Scope.normalize(options.project);
      scope = Scope.fromTypeAndProject(options.type, projectId);
    } else {
      const project = await resolveProject(projectResolver);
      projectId = project.projectId;
      console.log(chalk.gray(`Detected project: ${projectId} (${project.source})`));
      scope = Scope.fromTypeAndProject(options.type, projectId);
    }

    let content = options.content;
    if (!content) {
      content = await openEditor('');
    }

    const repo = new FileMemoryRepository({ basePath });
    const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });

    const useCase = new SaveMemoryUseCase(repo, vectorIndex, embeddingProvider, enrichmentService);
    const result = await useCase.execute({
      title: options.title,
      content,
      type: options.type,
      scope,
      projectId,
      tags,
    });

    console.log(chalk.green(`Memory saved: ${result.id} (${scope})`));
  });

memoryCmd
  .command('show <id>')
  .description('Show a memory')
  .action(async (id: string) => {
    const { basePath } = await loadContainer();
    const repo = new FileMemoryRepository({ basePath });
    const memory = await repo.findById(id);

    if (!memory) {
      console.log(chalk.red(`Memory not found: ${id}`));
      process.exit(1);
    }

    console.log(memoryToMarkdown(memory));
  });

memoryCmd
  .command('edit <id>')
  .description('Edit a memory in your default editor')
  .action(async (id: string) => {
    const { basePath, embeddingProvider, enrichmentService } = await loadContainer();
    const repo = new FileMemoryRepository({ basePath });
    const memory = await repo.findById(id);

    if (!memory) {
      console.log(chalk.red(`Memory not found: ${id}`));
      process.exit(1);
    }

    const updated = await openEditor(memoryToMarkdown(memory));
    const parsed = memoryFromMarkdown(id, updated);

    const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });

    const useCase = new UpdateMemoryUseCase(repo, vectorIndex, embeddingProvider, enrichmentService);
    await useCase.execute({
      id,
      title: parsed.title,
      content: parsed.content,
      type: parsed.type,
      scope: parsed.scope,
      tags: parsed.tags,
    });

    console.log(chalk.green(`Memory updated: ${id}`));
  });

memoryCmd
  .command('purge')
  .description('Delete all memories in a scope')
  .option('--scope <scope>')
  .option('--project <projectId>', 'project id (alias for --scope project/<id>; auto-detected when omitted)')
  .option('--source <source>', 'only delete memories with this source (e.g. codebase-indexer)')
  .option('--yes', 'skip confirmation')
  .action(async (options) => {
    const { basePath, vectorIndex, projectResolver } = await loadContainer();

    let scope: string | undefined;
    if (options.scope) {
      scope = options.scope;
    } else {
      const project = options.project
        ? await resolveProject(projectResolver, options.project)
        : await resolveProject(projectResolver);
      console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));
      scope = `project/${project.projectId}`;
    }

    const repo = new FileMemoryRepository({ basePath });
    const memories = await repo.list({ scope, limit: 100000 });
    const filtered = options.source
      ? memories.filter((m) => m.source === options.source)
      : memories;

    if (filtered.length === 0) {
      console.log(chalk.yellow(`No memories found in scope ${scope}.`));
      return;
    }

    if (!options.yes) {
      const confirmed = await confirm(`Delete ${filtered.length} memories in scope ${scope}?`);
      if (!confirmed) {
        console.log(chalk.yellow('Purge cancelled.'));
        return;
      }
    }

    for (const memory of filtered) {
      try {
        await repo.delete(memory.id);
      } catch {
        // ignore
      }
      try {
        await vectorIndex.remove(memory.id);
      } catch {
        // ignore
      }
    }

    console.log(chalk.green(`Purged ${filtered.length} memories in scope ${scope}.`));
  });

memoryCmd
  .command('delete <id>')
  .description('Delete a memory')
  .option('--yes', 'skip confirmation')
  .action(async (id: string, options: { yes?: boolean }) => {
    const { basePath } = await loadContainer();

    if (!options.yes) {
      const confirmed = await confirm(`Delete memory ${id}?`);
      if (!confirmed) {
        console.log(chalk.yellow('Delete cancelled.'));
        return;
      }
    }

    const repo = new FileMemoryRepository({ basePath });
    const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });
    const useCase = new DeleteMemoryUseCase(repo, vectorIndex);
    await useCase.execute(id);
    console.log(chalk.green(`Memory deleted: ${id}`));
  });

const sessionCmd = program.command('session').description('Manage sessions');

sessionCmd
  .command('list')
  .description('List recent sessions')
  .option('--project <projectId>', 'filter by project id (auto-detected when omitted)')
  .option('--limit <limit>', 'number of sessions', '10')
  .action(async (options) => {
    const { basePath, projectResolver } = await loadContainer();
    const repo = new FileSessionRepository({ basePath });
    const project = options.project
      ? await resolveProject(projectResolver, options.project)
      : await resolveProject(projectResolver);
    console.log(chalk.gray(`Filtering sessions by project: ${project.projectId} (${project.source})`));
    const sessions = await repo.listRecent(parseInt(options.limit, 10), project.projectId);

    const table = new Table({
      head: [chalk.bold('ID'), chalk.bold('Project'), chalk.bold('Date'), chalk.bold('Messages')],
      colWidths: [24, 24, 28, 10],
    });

    for (const session of sessions) {
      table.push([
        session.id,
        session.projectId,
        session.createdAt.toISOString(),
        String(session.messages.length),
      ]);
    }

    console.log(table.toString());
  });

sessionCmd
  .command('show <id>')
  .description('Show a session log')
  .action(async (id: string) => {
    const { basePath } = await loadContainer();
    const repo = new FileSessionRepository({ basePath });
    const session = await repo.findById(id);

    if (!session) {
      console.log(chalk.red(`Session not found: ${id}`));
      process.exit(1);
    }

    console.log(chalk.bold(`Session: ${session.id}`));
    console.log(chalk.gray(`Project: ${session.projectId}`));
    console.log(chalk.gray(`Date: ${session.createdAt.toISOString()}`));
    console.log();

    for (const message of session.messages) {
      const roleColor = message.role === 'user' ? chalk.blue : chalk.green;
      console.log(roleColor(`[${message.role}] ${message.timestamp.toISOString()}`));
      console.log(message.content);
      console.log();
    }
  });

program
  .command('distill')
  .description('Distill unprocessed sessions into memories')
  .option('--dry-run', 'show what would be created without saving')
  .option('--limit <limit>', 'maximum sessions to process', '10')
  .action(async (options) => {
    const { basePath } = await loadContainer();
    const spinner = ora('Distilling sessions').start();

    try {
      const memoryRepo = new FileMemoryRepository({ basePath });
      const sessionRepo = new FileSessionRepository({ basePath });
      const useCase = new DistillSessionsUseCase(memoryRepo, sessionRepo);
      const result = await useCase.execute({
        dryRun: options.dryRun,
        limit: parseInt(options.limit, 10),
      });

      spinner.succeed(
        `Distilled ${result.processed} sessions into ${result.memoriesCreated} memories${
          options.dryRun ? ' (dry run)' : ''
        }`
      );
    } catch (error) {
      spinner.fail(`Distillation failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show vault status')
  .action(async () => {
    const { basePath, configStore } = await loadContainer();
    const memoryRepo = new FileMemoryRepository({ basePath });
    const sessionRepo = new FileSessionRepository({ basePath });
    const config = await configStore.load();

    const memories = await memoryRepo.list({ limit: 10000 });
    const sessions = await sessionRepo.listRecent(10000);

    console.log(chalk.bold('DiamondBlock Status'));
    console.log();
    console.log(`Vault path:      ${chalk.cyan(basePath)}`);
    console.log(`Embedding:       ${chalk.cyan(config.embeddingProvider ?? 'local')}`);
    console.log(`Memories:        ${chalk.cyan(memories.length)}`);
    console.log(`Sessions:        ${chalk.cyan(sessions.length)}`);
  });

const indexCmd = program.command('index').description('Codebase index operations');

async function resolveIndexProject(
  projectResolver: ProjectResolver,
  explicitProject?: string
): Promise<{ projectId: string; source: string }> {
  return explicitProject
    ? await resolveProject(projectResolver, explicitProject)
    : await resolveProject(projectResolver);
}

async function runIndex(
  projectPath: string | undefined,
  options: {
    project?: string;
    force?: boolean;
    dryRun?: boolean;
  }
): Promise<void> {
  const container = await loadContainer();

  const projectId = options.project ? Scope.normalizeProjectId(options.project) : undefined;

  const spinner = ora('Preparing to index').start();

  try {
    if (
      !container.codebaseScanner ||
      !container.parsingPipeline ||
      !container.codebaseIndexRepository ||
      !container.codebaseChunkRepository
    ) {
      throw new Error('Codebase indexer dependencies are not available');
    }

    const useCase = new IndexCodebaseUseCase(
      container.projectResolver,
      container.codebaseScanner,
      container.parsingPipeline,
      container.codebaseIndexRepository,
      container.codebaseChunkRepository,
      container.memoryRepository,
      container.vectorIndex,
      container.embeddingProvider
    );

    let currentFile = 0;
    let totalFiles = 0;

    const result = await useCase.execute(
      {
        projectPath,
        projectId,
        force: options.force,
        dryRun: options.dryRun,
      },
      {
        onScanStart: () => {
          spinner.text = 'Scanning project files...';
        },
        onScanComplete: (files) => {
          totalFiles = files.length;
          spinner.text = `Found ${files.length} files to analyze`;
          if (files.length > 0) {
            console.log(chalk.gray(`Found ${files.length} files`));
          }
        },
        onFileStart: (file, current, total) => {
          currentFile = current;
          spinner.text = `Indexing file ${current}/${total}: ${file.relativePath}`;
        },
        onFileComplete: (file, chunks, current, total) => {
          currentFile = current;
          spinner.text = `Indexed ${current}/${total}: ${file.relativePath} (${chunks} chunks)`;
          if (current % 10 === 0 || current === total) {
            console.log(chalk.gray(`Indexed ${current}/${total} files`));
          }
        },
        onSavingStart: () => {
          spinner.text = 'Saving index manifest...';
          console.log(chalk.gray('Saving index manifest...'));
        },
        onSavingComplete: () => {
          spinner.text = 'Finalizing...';
        },
      }
    );

    spinner.stop();

    console.log(chalk.bold('Codebase indexed'));
    console.log();
    console.log(`Project:        ${chalk.cyan(result.projectId)}`);
    console.log(`Files scanned:  ${chalk.cyan(result.scanned)}`);
    console.log(`Files indexed:  ${chalk.cyan(result.indexed)}`);
    console.log(`Files removed:  ${chalk.cyan(result.removed)}`);
    if (options.dryRun) {
      console.log(chalk.gray('(dry run — no changes saved)'));
    }
  } catch (error) {
    spinner.fail(`Indexing failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function showIndexStatus(options: { project?: string }): Promise<void> {
  const container = await loadContainer();
  const repo = container.codebaseIndexRepository;
  if (!repo) {
    console.log(chalk.red('Codebase indexer is not available.'));
    process.exit(1);
  }
  const project = await resolveIndexProject(container.projectResolver, options.project);
  console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));

  const manifest = await repo.load(project.projectId);
  if (!manifest) {
    console.log(chalk.yellow(`No index found for project ${project.projectId}.`));
    return;
  }
  const fileCount = Object.keys(manifest.files).length;
  console.log(chalk.bold('Codebase Index Status'));
  console.log();
  console.log(`Project:     ${chalk.cyan(manifest.projectId)}`);
  console.log(`Root path:   ${chalk.cyan(manifest.rootPath)}`);
  console.log(`Files:       ${chalk.cyan(fileCount)}`);
  console.log(`Created:     ${chalk.cyan(manifest.createdAt)}`);
  console.log(`Updated:     ${chalk.cyan(manifest.updatedAt)}`);
}

async function purgeIndex(options: { project?: string; yes?: boolean }): Promise<void> {
  const container = await loadContainer();

  if (!container.codebaseIndexRepository || !container.codebaseChunkRepository || !container.vectorIndex) {
    console.log(chalk.red('Codebase indexer dependencies are not available.'));
    process.exit(1);
  }

  const project = await resolveIndexProject(container.projectResolver, options.project);
  console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));

  const manifest = await container.codebaseIndexRepository.load(project.projectId);
  let removedChunks = 0;

  if (manifest) {
    if (!options.yes) {
      const total = Object.values(manifest.files).reduce((sum, entry) => sum + entry.chunkIds.length, 0);
      const confirmed = await confirm(
        `Delete codebase index for ${project.projectId} (${total} chunks)?`
      );
      if (!confirmed) {
        console.log(chalk.yellow('Purge cancelled.'));
        return;
      }
    }

    for (const entry of Object.values(manifest.files)) {
      for (const chunkId of entry.chunkIds) {
        try {
          await container.vectorIndex.remove(chunkId);
        } catch {
          // ignore
        }
        removedChunks++;
      }
    }
    await container.codebaseIndexRepository.delete(project.projectId);
  }

  removedChunks += await container.codebaseChunkRepository.purge(project.projectId);

  console.log(chalk.bold('Codebase index purged'));
  console.log();
  console.log(`Project:         ${chalk.cyan(project.projectId)}`);
  console.log(`Chunks removed:  ${chalk.cyan(removedChunks)}`);
}

async function cleanIndexOrphans(options: { project?: string }): Promise<void> {
  const container = await loadContainer();

  if (!container.orphanedChunkCleaner || !container.codebaseIndexRepository) {
    console.log(chalk.red('Codebase indexer dependencies are not available.'));
    process.exit(1);
  }

  const project = await resolveIndexProject(container.projectResolver, options.project);
  console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));

  const result = await container.orphanedChunkCleaner.clean(project.projectId);
  console.log(chalk.bold('Orphaned chunks cleaned'));
  console.log();
  console.log(`Project:         ${chalk.cyan(result.projectId)}`);
  console.log(`Chunks removed:  ${chalk.cyan(result.chunkIdsRemoved)}`);
}

indexCmd
  .command('run [path]', { isDefault: true })
  .description('Index a codebase into the vault for semantic code search')
  .option('--project <projectId>', 'project id (auto-detected when omitted)')
  .option('--force', 'reindex all files regardless of content hash')
  .option('--dry-run', 'show what would be indexed without saving')
  .option('--status', 'show current index status for the project')
  .option('--clean-orphans', 'remove codebase chunks not referenced by the index manifest')
  .option('--purge', 'delete the entire codebase index for the project')
  .option('--yes', 'skip confirmation when using --purge')
  .action(async (projectPath: string | undefined, options) => {
    if (options.purge) {
      await purgeIndex({ project: options.project, yes: options.yes });
      return;
    }

    if (options.cleanOrphans) {
      await cleanIndexOrphans({ project: options.project });
      return;
    }

    if (options.status) {
      await showIndexStatus({ project: options.project });
      return;
    }

    await runIndex(projectPath, {
      project: options.project,
      force: options.force,
      dryRun: options.dryRun,
    });
  });

indexCmd
  .command('list')
  .description('List indexed codebase chunks')
  .option('--project <projectId>', 'project id (auto-detected when omitted)')
  .option('--limit <limit>', 'number of chunks', '20')
  .action(async (options) => {
    const { basePath, projectResolver } = await loadContainer();
    const repo = new FileCodebaseChunkRepository({ basePath });

    const project = await resolveIndexProject(projectResolver, options.project);
    console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));

    const chunks = await repo.list({
      projectId: project.projectId,
      limit: parseInt(options.limit, 10),
    });

    if (chunks.length === 0) {
      console.log(chalk.yellow(`No indexed chunks found for project ${project.projectId}.`));
      return;
    }

    const table = new Table({
      head: [chalk.bold('ID'), chalk.bold('File'), chalk.bold('Lines'), chalk.bold('Language')],
      colWidths: [24, 40, 16, 16],
    });

    for (const chunk of chunks) {
      table.push([
        chunk.id,
        chunk.filePath,
        `${chunk.startLine}-${chunk.endLine}`,
        chunk.language,
      ]);
    }

    console.log(table.toString());
  });

indexCmd
  .command('search <query>')
  .description('Search indexed codebase chunks by semantic meaning')
  .option('--project <projectId>', 'project id (auto-detected when omitted)')
  .option('--limit <limit>', 'number of results', '5')
  .action(async (query: string, options) => {
    const { basePath, embeddingProvider, projectResolver } = await loadContainer();
    const repo = new FileCodebaseChunkRepository({ basePath });
    const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });

    const project = await resolveIndexProject(projectResolver, options.project);
    console.log(chalk.gray(`Detected project: ${project.projectId} (${project.source})`));

    const spinner = ora('Searching codebase').start();

    try {
      const embedding = await embeddingProvider.embed(query);
      const results = await vectorIndex.search(embedding, parseInt(options.limit, 10), {
        scope: `project/${project.projectId}`,
      });

      spinner.stop();

      if (results.length === 0) {
        console.log(chalk.yellow('No chunks found.'));
        return;
      }

      const table = new Table({
        head: [chalk.bold('Score'), chalk.bold('ID'), chalk.bold('File'), chalk.bold('Lines')],
        colWidths: [10, 24, 40, 16],
      });

      for (const result of results) {
        const chunk = await repo.findById(result.id);
        table.push([
          result.score.toFixed(3),
          result.id,
          chunk?.filePath ?? 'unknown',
          chunk ? `${chunk.startLine}-${chunk.endLine}` : '-',
        ]);
      }

      console.log(table.toString());
    } catch (error) {
      spinner.fail(`Search failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

indexCmd
  .command('status')
  .description('Show current index status for the project')
  .option('--project <projectId>', 'project id (auto-detected when omitted)')
  .action(async (options) => {
    await showIndexStatus({ project: options.project });
  });

indexCmd
  .command('purge')
  .description('Delete the entire codebase index for the project')
  .option('--project <projectId>', 'project id (auto-detected when omitted)')
  .option('--yes', 'skip confirmation')
  .action(async (options) => {
    await purgeIndex({ project: options.project, yes: options.yes });
  });

indexCmd
  .command('clean-orphans')
  .description('Remove codebase chunks not referenced by the index manifest')
  .option('--project <projectId>', 'project id (auto-detected when omitted)')
  .action(async (options) => {
    await cleanIndexOrphans({ project: options.project });
  });

async function openEditor(content: string): Promise<string> {
  const editor = process.env.EDITOR ?? 'nano';
  const tmpFile = join(tmpdir(), `diamondblock-${randomBytes(8).toString('hex')}.md`);
  const fs = await import('node:fs/promises');
  await fs.writeFile(tmpFile, content, 'utf-8');

  return new Promise((resolve, reject) => {
    const child = spawn(editor, [tmpFile], {
      stdio: 'inherit',
    });

    child.on('exit', async (code) => {
      try {
        const updated = await readFile(tmpFile, 'utf-8');
        await fs.unlink(tmpFile);
        if (code === 0) {
          resolve(updated);
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

program
  .command('web')
  .description('Start the DiamondBlock web UI')
  .option('--port <port>', 'HTTP port to listen on', '3847')
  .option('--no-open', 'do not open browser automatically')
  .action(async (options) => {
    const container = await loadContainer();
    const staticDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web');
    await startWebServer(container, {
      port: parseInt(options.port, 10),
      host: '127.0.0.1',
      staticDir,
      open: options.open,
    });
  });

program.parse();
