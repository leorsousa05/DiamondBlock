import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getContainer, setContainer } from '../../container.js';
import { createDefaultContainer } from '../../container_factory.js';
import { GetContextUseCase } from '../../application/use_cases/get_context.js';
import { SaveMemoryUseCase } from '../../application/use_cases/save_memory.js';
import { SearchMemoryUseCase } from '../../application/use_cases/search_memory.js';
import { UpdateMemoryUseCase } from '../../application/use_cases/update_memory.js';
import { DeleteMemoryUseCase } from '../../application/use_cases/delete_memory.js';
import { LogSessionUseCase } from '../../application/use_cases/log_session.js';
import { IndexCodebaseUseCase } from '../../application/use_cases/index_codebase.js';
import { Scope } from '../../domain/scope.js';

const DEBUG = process.env.DIAMONDBLOCK_DEBUG === 'true';

function debugLog(message: string): void {
  if (DEBUG) {
    console.error(`[diamondblock] ${message}`);
  }
}

export function resolveSearchScope(input: { scope?: string; project_id?: string }): string | undefined {
  if (input.scope) return Scope.normalize(input.scope);
  if (input.project_id) return Scope.fromTypeAndProject('project', input.project_id);
  return undefined;
}

const getContextInputSchema = z.object({
  session_id: z.string(),
  project_id: z.string(),
  mode: z.string().optional(),
});

export const searchMemoryInputSchema = z.object({
  query: z.string(),
  scope: z.string().optional(),
  project_id: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export const saveMemoryInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.enum(['user', 'project', 'knowledge', 'distilled']),
  scope: z.string().optional(),
  project_id: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const updateMemoryInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['user', 'project', 'knowledge', 'distilled']).optional(),
  scope: z.string().optional(),
  project_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  append: z.boolean().optional(),
});

const deleteMemoryInputSchema = z.object({
  id: z.string(),
});

const logSessionInputSchema = z.object({
  session_id: z.string(),
  project_id: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      timestamp: z.string().datetime().optional(),
    })
  ),
});

export const indexCodebaseInputSchema = z.object({
  project_id: z.string().optional(),
  path: z.string().optional(),
  force: z.boolean().optional(),
  dry_run: z.boolean().optional(),
});

const packageJsonPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'package.json'
);
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as { version: string };

export async function startMcpServer(): Promise<void> {
  const container = getContainer();

  const server = new Server(
    {
      name: 'diamondblock',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_context',
        description: 'Get compact context for the current coding session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            project_id: { type: 'string' },
            mode: { type: 'string' },
          },
          required: ['session_id', 'project_id'],
        },
      },
      {
        name: 'search_memory',
        description: 'Search memories by semantic meaning',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            scope: { type: 'string' },
            project_id: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
        },
      },
      {
        name: 'save_memory',
        description: 'Save a new memory to the vault',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            type: { type: 'string', enum: ['user', 'project', 'knowledge', 'distilled'] },
            scope: { type: 'string' },
            project_id: { type: 'string' },
            source: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
          },
          required: ['title', 'content', 'type'],
        },
      },
      {
        name: 'update_memory',
        description: 'Update an existing memory',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            type: { type: 'string' },
            scope: { type: 'string' },
            project_id: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
            append: { type: 'boolean' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by id',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
      {
        name: 'log_session',
        description: 'Log a session for later distillation',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            project_id: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                  timestamp: { type: 'string' },
                },
                required: ['role', 'content'],
              },
            },
          },
          required: ['session_id', 'project_id', 'messages'],
        },
      },
      {
        name: 'index_codebase',
        description: 'Index a codebase into the vault for semantic code search',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: { type: 'string' },
            path: { type: 'string' },
            force: { type: 'boolean' },
            dry_run: { type: 'boolean' },
          },
          required: [],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_context': {
          const input = getContextInputSchema.parse(args);
          const useCase = new GetContextUseCase(
            container.memoryRepository,
            container.sessionRepository
          );
          const result = await useCase.execute({
            sessionId: input.session_id,
            projectId: input.project_id,
            mode: input.mode,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }

        case 'search_memory': {
          const input = searchMemoryInputSchema.parse(args);
          const scope = resolveSearchScope(input);
          debugLog(`search_memory resolved scope: ${scope ?? 'all'}, project_id: ${input.project_id ?? 'none'}`);
          const useCase = new SearchMemoryUseCase(
            container.memoryRepository,
            container.vectorIndex,
            container.embeddingProvider
          );
          const result = await useCase.execute({
            query: input.query,
            scope,
            limit: input.limit,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }

        case 'save_memory': {
          const input = saveMemoryInputSchema.parse(args);
          const resolvedScope = input.scope ? Scope.normalize(input.scope) : undefined;
          debugLog(`save_memory project_id: ${input.project_id ?? 'none'}, scope: ${resolvedScope ?? 'derived'}`);
          const useCase = new SaveMemoryUseCase(
            container.memoryRepository,
            container.vectorIndex,
            container.embeddingProvider,
            container.enrichmentService
          );
          const result = await useCase.execute({
            title: input.title,
            content: input.content,
            type: input.type,
            scope: resolvedScope,
            projectId: input.project_id ? Scope.normalize(input.project_id) : undefined,
            source: input.source,
            tags: input.tags,
            confidence: input.confidence,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }

        case 'update_memory': {
          const input = updateMemoryInputSchema.parse(args);
          const resolvedScope = input.scope ? Scope.normalize(input.scope) : undefined;
          debugLog(`update_memory project_id: ${input.project_id ?? 'none'}, scope: ${resolvedScope ?? 'unchanged'}`);
          const useCase = new UpdateMemoryUseCase(
            container.memoryRepository,
            container.vectorIndex,
            container.embeddingProvider,
            container.enrichmentService
          );
          await useCase.execute({
            id: input.id,
            title: input.title,
            content: input.content,
            type: input.type,
            scope: resolvedScope,
            projectId: input.project_id ? Scope.normalize(input.project_id) : undefined,
            tags: input.tags,
            confidence: input.confidence,
            append: input.append,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
          };
        }

        case 'delete_memory': {
          const input = deleteMemoryInputSchema.parse(args);
          const useCase = new DeleteMemoryUseCase(
            container.memoryRepository,
            container.vectorIndex
          );
          await useCase.execute(input.id);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
          };
        }

        case 'log_session': {
          const input = logSessionInputSchema.parse(args);
          const useCase = new LogSessionUseCase(container.sessionRepository);
          await useCase.execute({
            sessionId: input.session_id,
            projectId: input.project_id,
            messages: input.messages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            })),
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
          };
        }

        case 'index_codebase': {
          const input = indexCodebaseInputSchema.parse(args);
          if (!container.codebaseScanner || !container.codeChunker || !container.codebaseIndexRepository) {
            throw new Error('Codebase indexer dependencies are not available');
          }
          const useCase = new IndexCodebaseUseCase(
            container.projectResolver,
            container.codebaseScanner,
            container.codeChunker,
            container.codebaseIndexRepository,
            container.memoryRepository,
            container.vectorIndex,
            container.embeddingProvider
          );
          const result = await useCase.execute({
            projectPath: input.path,
            projectId: input.project_id,
            force: input.force,
            dryRun: input.dry_run,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function main(): Promise<void> {
  const vaultPath = process.env.DB_HOME;
  console.error(`[diamondblock] Initializing vault at ${vaultPath ?? 'default'}`);
  const container = await createDefaultContainer(vaultPath);
  setContainer(container);
  console.error('[diamondblock] Container initialized, starting MCP server');
  await startMcpServer();
}

const isMainModule = import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch((error) => {
    console.error('MCP server failed:', error);
    process.exit(1);
  });
}
