#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { setContainer } from '../../container.js';
import { initializeVault, defaultVaultPath } from '../../infrastructure/vault_initializer.js';
import { FileMemoryRepository } from '../../infrastructure/file_memory_repository.js';
import { FileSessionRepository } from '../../infrastructure/file_session_repository.js';
import { SqliteVectorIndex } from '../../infrastructure/sqlite_vector_index.js';
import { LocalEmbeddingProvider } from '../../infrastructure/local_embedding_provider.js';
import { OpenAIEmbeddingProvider } from '../../infrastructure/openai_embedding_provider.js';
import { YamlConfigStore } from '../../infrastructure/yaml_config_store.js';
import type { EmbeddingProvider } from '../../application/ports/embedding_provider.js';
import { SaveMemoryUseCase } from '../../application/use_cases/save_memory.js';
import { SearchMemoryUseCase } from '../../application/use_cases/search_memory.js';
import { DeleteMemoryUseCase } from '../../application/use_cases/delete_memory.js';
import { DistillSessionsUseCase } from '../../application/use_cases/distill_sessions.js';
import { memoryToMarkdown, memoryFromMarkdown } from '../../infrastructure/markdown_serializer.js';
import { UpdateMemoryUseCase } from '../../application/use_cases/update_memory.js';
import { LocalEnrichmentProvider } from '../../infrastructure/local_enrichment_provider.js';
import { MemoryEnrichmentService } from '../../domain/services/memory_enrichment.js';

const program = new Command();

program
  .name('diamondblock')
  .description('DiamondBlock — local AI memory')
  .version('0.1.0')
  .option('--vault <path>', 'path to DiamondBlock vault');

function createEmbeddingProvider(config: {
  embeddingProvider?: string;
  openaiApiKey?: string;
  openaiEmbeddingModel?: string;
}): EmbeddingProvider {
  if (config.embeddingProvider === 'openai' && config.openaiApiKey) {
    return new OpenAIEmbeddingProvider({
      apiKey: config.openaiApiKey,
      model: config.openaiEmbeddingModel,
    });
  }
  return new LocalEmbeddingProvider();
}

async function loadContainer(vaultPath?: string) {
  if (!vaultPath) {
    vaultPath = program.opts().vault;
  }
  const configStore = new YamlConfigStore();
  const config = await configStore.load();
  const basePath = vaultPath ?? config.vaultPath ?? defaultVaultPath();

  const memoryRepository = new FileMemoryRepository({ basePath });
  const sessionRepository = new FileSessionRepository({ basePath });
  const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });
  const embeddingProvider = createEmbeddingProvider(config);
  const enrichmentProvider = new LocalEnrichmentProvider();
  const enrichmentService = new MemoryEnrichmentService(
    memoryRepository,
    vectorIndex,
    embeddingProvider,
    enrichmentProvider,
    { confidenceThreshold: 0.5, maxTags: 10, maxEntities: 10 }
  );

  setContainer({
    memoryRepository,
    sessionRepository,
    vectorIndex,
    embeddingProvider,
    configStore,
    enrichmentService,
  });

  return { basePath, configStore, embeddingProvider, enrichmentService };
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
  .option('--limit <limit>', 'number of memories', '20')
  .action(async (options) => {
    const { basePath } = await loadContainer();
    const repo = new FileMemoryRepository({ basePath });
    const memories = await repo.list({
      scope: options.scope,
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
  .option('--limit <limit>', 'number of results', '5')
  .action(async (query: string, options) => {
    const { basePath, embeddingProvider } = await loadContainer();
    const spinner = ora('Searching memories').start();

    try {
      const repo = new FileMemoryRepository({ basePath });
      const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });

      const useCase = new SearchMemoryUseCase(repo, vectorIndex, embeddingProvider);
      const results = await useCase.execute({
        query,
        scope: options.scope,
        limit: parseInt(options.limit, 10),
      });

      spinner.stop();

      if (results.length === 0) {
        console.log(chalk.yellow('No memories found.'));
        return;
      }

      const table = new Table({
        head: [chalk.bold('Score'), chalk.bold('ID'), chalk.bold('Title'), chalk.bold('Path')],
        colWidths: [10, 24, 40, 40],
      });

      for (const result of results) {
        table.push([
          result.score.toFixed(3),
          result.id,
          result.title,
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
  .option('--scope <scope>', 'memory scope', 'global')
  .option('--content <content>')
  .option('--tag <tag>', 'tags', [])
  .action(async (options) => {
    const { basePath, embeddingProvider, enrichmentService } = await loadContainer();
    const tags = Array.isArray(options.tag) ? options.tag : [options.tag].filter(Boolean);

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
      scope: options.scope,
      tags,
    });

    console.log(chalk.green(`Memory saved: ${result.id}`));
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
  .option('--limit <limit>', 'number of sessions', '10')
  .action(async (options) => {
    const { basePath } = await loadContainer();
    const repo = new FileSessionRepository({ basePath });
    const sessions = await repo.listRecent(parseInt(options.limit, 10));

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

program.parse();
