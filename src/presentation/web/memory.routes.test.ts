import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { memoryRoutes } from './routes/memory.routes.js';
import type { Memory } from '../../domain/memory.js';
import type { Container } from '../../container.js';

function makeMemory(overrides?: Partial<Memory>): Memory {
  return {
    id: 'mem_test001',
    type: 'knowledge',
    scope: 'global',
    title: 'Test Memory',
    content: 'Test content',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    source: 'manual',
    tags: ['test'],
    confidence: 1.0,
    ...overrides,
  };
}

function makeContainer(overrides?: Partial<Container>): Container {
  const memoryRepository = {
    findById: vi.fn().mockResolvedValue(makeMemory()),
    search: vi.fn().mockResolvedValue([]),
    searchWithScore: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([makeMemory()]),
    resolvePath: vi.fn().mockReturnValue('/vault/mem_test001.md'),
  };

  const vectorIndex = {
    index: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  const embeddingProvider = {
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    isAvailable: vi.fn().mockResolvedValue(false),
  };

  return {
    memoryRepository,
    vectorIndex,
    embeddingProvider,
    sessionRepository: {
      findById: vi.fn(),
      save: vi.fn(),
      listRecent: vi.fn().mockResolvedValue([]),
    },
    configStore: {
      load: vi.fn().mockResolvedValue({}),
      save: vi.fn(),
    },
    projectResolver: {
      resolve: vi.fn(),
    },
    ...overrides,
  } as unknown as Container;
}

async function buildApp(container: Container) {
  const app = Fastify({ logger: false });
  await app.register(memoryRoutes, { container });
  return app;
}

describe('Memory Routes', () => {
  let container: Container;

  beforeEach(() => {
    container = makeContainer();
  });

  describe('GET /api/memories', () => {
    it('returns list of memories', async () => {
      const app = await buildApp(container);
      const res = await app.inject({ method: 'GET', url: '/api/memories' });
      expect(res.statusCode).toBe(200);
      const body = res.json<Memory[]>();
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].id).toBe('mem_test001');
    });

    it('calls list with limit from query param', async () => {
      const app = await buildApp(container);
      await app.inject({ method: 'GET', url: '/api/memories?limit=5' });
      expect(container.memoryRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });

    it('calls search when q param provided', async () => {
      const app = await buildApp(container);
      await app.inject({ method: 'GET', url: '/api/memories?q=hello' });
      // SearchMemoryUseCase uses repository.search as fallback when embedding unavailable
      expect(container.memoryRepository.search).toHaveBeenCalled();
    });
  });

  describe('GET /api/memories/:id', () => {
    it('returns memory by id', async () => {
      const app = await buildApp(container);
      const res = await app.inject({ method: 'GET', url: '/api/memories/mem_test001' });
      expect(res.statusCode).toBe(200);
      const body = res.json<Memory>();
      expect(body.id).toBe('mem_test001');
    });

    it('returns 404 when memory not found', async () => {
      (container.memoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const app = await buildApp(container);
      const res = await app.inject({ method: 'GET', url: '/api/memories/doesnotexist' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/memories', () => {
    it('creates a memory and returns 201 with id', async () => {
      (container.memoryRepository.save as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const app = await buildApp(container);
      const res = await app.inject({
        method: 'POST',
        url: '/api/memories',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: 'New Memory',
          content: 'Content here',
          type: 'knowledge',
        }),
      });
      expect(res.statusCode).toBe(201);
      const body = res.json<{ id: string }>();
      expect(typeof body.id).toBe('string');
    });

    it('returns 400 for invalid body', async () => {
      const app = await buildApp(container);
      const res = await app.inject({
        method: 'POST',
        url: '/api/memories',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'No type' }),
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/memories/:id', () => {
    it('updates memory and returns updated object', async () => {
      const app = await buildApp(container);
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/memories/mem_test001',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when memory does not exist', async () => {
      (container.memoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const app = await buildApp(container);
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/memories/ghost',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/memories/:id', () => {
    it('deletes memory and returns 204', async () => {
      const app = await buildApp(container);
      const res = await app.inject({ method: 'DELETE', url: '/api/memories/mem_test001' });
      expect(res.statusCode).toBe(204);
    });
  });

  describe('POST /api/memories/purge', () => {
    it('deletes matching memories and returns count', async () => {
      const app = await buildApp(container);
      const res = await app.inject({
        method: 'POST',
        url: '/api/memories/purge',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ deleted: number }>();
      expect(typeof body.deleted).toBe('number');
    });
  });
});
