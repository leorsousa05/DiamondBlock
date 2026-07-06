import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getContainer, setContainer } from '../../container.js';
import { createDefaultContainer } from '../../container_factory.js';
import { GetContextUseCase } from '../../application/use_cases/get_context.js';
import { SaveMemoryUseCase } from '../../application/use_cases/save_memory.js';
import { SearchMemoryUseCase } from '../../application/use_cases/search_memory.js';
import { UpdateMemoryUseCase } from '../../application/use_cases/update_memory.js';
import { DeleteMemoryUseCase } from '../../application/use_cases/delete_memory.js';
import { LogSessionUseCase } from '../../application/use_cases/log_session.js';

const getContextInputSchema = z.object({
  session_id: z.string(),
  project_id: z.string(),
  mode: z.string().optional(),
});

const searchMemoryInputSchema = z.object({
  query: z.string(),
  scope: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

const saveMemoryInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.enum(['user', 'project', 'knowledge', 'distilled']),
  scope: z.string(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const updateMemoryInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['user', 'project', 'knowledge', 'distilled']).optional(),
  scope: z.string().optional(),
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

export async function startMcpServer(): Promise<void> {
  const container = getContainer();

  const server = new Server(
    {
      name: 'diamondblock',
      version: '0.1.0',
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
            source: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' },
          },
          required: ['title', 'content', 'type', 'scope'],
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
          const useCase = new SearchMemoryUseCase(
            container.memoryRepository,
            container.vectorIndex,
            container.embeddingProvider
          );
          const result = await useCase.execute({
            query: input.query,
            scope: input.scope,
            limit: input.limit,
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        }

        case 'save_memory': {
          const input = saveMemoryInputSchema.parse(args);
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
            scope: input.scope,
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
            scope: input.scope,
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

main().catch((error) => {
  console.error('MCP server failed:', error);
  process.exit(1);
});
