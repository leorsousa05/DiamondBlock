#!/usr/bin/env node
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
import { FileSessionRepository } from '../../infrastructure/file_session_repository.js';
import { SqliteVectorIndex } from '../../infrastructure/sqlite_vector_index.js';
import { createDefaultContainer } from '../../container_factory.js';
import { SaveMemoryUseCase } from '../../application/use_cases/save_memory.js';
import { SearchMemoryUseCase } from '../../application/use_cases/search_memory.js';
import { DeleteMemoryUseCase } from '../../application/use_cases/delete_memory.js';
import { DistillSessionsUseCase } from '../../application/use_cases/distill_sessions.js';
import { memoryToMarkdown, memoryFromMarkdown } from '../../infrastructure/markdown_serializer.js';
import { UpdateMemoryUseCase } from '../../application/use_cases/update_memory.js';
import { Scope } from '../../domain/scope.js';
const program = new Command();
const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'package.json');
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
program
    .name('diamondblock')
    .description('DiamondBlock — local AI memory')
    .version(packageJson.version)
    .option('--vault <path>', 'path to DiamondBlock vault');
async function loadContainer(vaultPath) {
    if (!vaultPath) {
        vaultPath = program.opts().vault;
    }
    const container = await createDefaultContainer(vaultPath);
    setContainer(container);
    const config = await container.configStore.load();
    const basePath = vaultPath ?? config.vaultPath ?? defaultVaultPath();
    return { ...container, basePath };
}
async function resolveProject(projectResolver, explicitProject) {
    const info = await projectResolver.resolve(explicitProject);
    if (!info) {
        throw new Error('Could not resolve project');
    }
    return info;
}
program
    .command('init [path]')
    .description('Initialize a new DiamondBlock vault')
    .action(async (path) => {
    const vaultPath = path ?? defaultVaultPath();
    const spinner = ora(`Initializing vault at ${vaultPath}`).start();
    try {
        await initializeVault({ vaultPath, createSample: true });
        spinner.succeed(`Vault initialized at ${chalk.cyan(vaultPath)}`);
        console.log(chalk.gray('Run `diamondblock memory add` to create your first memory.'));
    }
    catch (error) {
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
    let scope;
    if (options.scope) {
        scope = options.scope;
    }
    else {
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
    .action(async (query, options) => {
    const { basePath, embeddingProvider, projectResolver } = await loadContainer();
    const spinner = ora('Searching memories').start();
    try {
        const repo = new FileMemoryRepository({ basePath });
        const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });
        let scope;
        if (options.scope) {
            scope = options.scope;
        }
        else {
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
    }
    catch (error) {
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
    let scope;
    let projectId;
    if (options.scope) {
        scope = Scope.normalize(options.scope);
    }
    else if (options.project) {
        projectId = Scope.normalize(options.project);
        scope = Scope.fromTypeAndProject(options.type, projectId);
    }
    else {
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
    .action(async (id) => {
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
    .action(async (id) => {
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
    .action(async (id, options) => {
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
    .action(async (id) => {
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
        spinner.succeed(`Distilled ${result.processed} sessions into ${result.memoriesCreated} memories${options.dryRun ? ' (dry run)' : ''}`);
    }
    catch (error) {
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
async function openEditor(content) {
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
                }
                else {
                    reject(new Error(`Editor exited with code ${code}`));
                }
            }
            catch (error) {
                reject(error);
            }
        });
    });
}
function confirm(question) {
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
//# sourceMappingURL=index.js.map