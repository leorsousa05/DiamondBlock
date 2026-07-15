import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '../../container.js';
import type { VectorIndexable } from '../../application/ports/vector_index.js';
import { FileCodebaseScanner } from '../../infrastructure/file_codebase_scanner.js';
import { FileCodebaseIndexRepository } from '../../infrastructure/file_codebase_index_repository.js';
import { FileCodebaseChunkRepository } from '../../infrastructure/file_codebase_chunk_repository.js';
import { ParserRegistryImpl } from '../../infrastructure/parser_registry_impl.js';
import { TypeScriptParser } from '../../infrastructure/typescript_parser.js';
import { SmartFallbackChunker } from '../../infrastructure/smart_fallback_chunker.js';
import { SemanticChunkBuilderImpl } from '../../infrastructure/semantic_chunk_builder_impl.js';
import { ParsingPipeline } from '../../infrastructure/parsing_pipeline.js';
import { indexRoutes } from './routes/index.routes.js';

class FakeEmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    return [text.toLowerCase().includes('add') ? 1 : 0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

class FakeVectorIndex {
  private readonly ids: string[] = [];

  async index(item: VectorIndexable): Promise<void> {
    this.ids.push(item.id);
  }

  async indexBatch(items: Array<{ item: VectorIndexable; embedding: number[] }>): Promise<void> {
    this.ids.push(...items.map(({ item }) => item.id));
  }

  async search(): Promise<Array<{ id: string; score: number }>> {
    return this.ids.map((id) => ({ id, score: 1 }));
  }

  async remove(): Promise<void> {}
  async removeBatch(): Promise<void> {}
}

async function buildApp(container: Container) {
  const app = Fastify({ logger: false });
  await app.register(indexRoutes, { container });
  return app;
}

describe('Index evaluation route', () => {
  const temporaryPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  });

  it('returns 503 when indexing dependencies are unavailable', async () => {
    const app = await buildApp({
      projectResolver: { resolve: vi.fn().mockResolvedValue(null) },
      embeddingProvider: new FakeEmbeddingProvider(),
      vectorIndex: new FakeVectorIndex(),
    } as unknown as Container);

    const response = await app.inject({
      method: 'POST',
      url: '/api/index/evaluate',
      payload: { query: 'add function' },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'Indexing infrastructure not available' });
    await app.close();
  });

  it('returns 400 when query is missing', async () => {
    const app = await buildApp({
      projectResolver: { resolve: vi.fn().mockResolvedValue({ projectId: 'test', source: 'argument' }) },
      codebaseScanner: {},
      parsingPipeline: {},
      codebaseIndexRepository: {},
      codebaseChunkRepository: {},
      embeddingProvider: new FakeEmbeddingProvider(),
      vectorIndex: new FakeVectorIndex(),
    } as unknown as Container);

    const response = await app.inject({ method: 'POST', url: '/api/index/evaluate', payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'query is required' });
    await app.close();
  });

  it('evaluates a temporary project and returns report metrics', async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), 'db-web-eval-project-'));
    const vaultPath = await mkdtemp(join(tmpdir(), 'db-web-eval-vault-'));
    temporaryPaths.push(projectRoot, vaultPath);
    await mkdir(join(projectRoot, 'src'), { recursive: true });
    await writeFile(
      join(projectRoot, 'src/math.ts'),
      'export function add(a: number, b: number): number {\n  return a + b;\n}',
      'utf-8'
    );

    const registry = new ParserRegistryImpl();
    registry.register('typescript', new TypeScriptParser());
    const container = {
      projectResolver: {
        resolve: vi.fn().mockResolvedValue({ projectId: 'web-project', source: 'argument' }),
      },
      codebaseScanner: new FileCodebaseScanner(),
      parsingPipeline: new ParsingPipeline({
        registry,
        fallbackChunker: new SmartFallbackChunker(),
        semanticChunkBuilder: new SemanticChunkBuilderImpl(),
      }),
      codebaseIndexRepository: new FileCodebaseIndexRepository({ basePath: vaultPath }),
      codebaseChunkRepository: new FileCodebaseChunkRepository({ basePath: vaultPath }),
      embeddingProvider: new FakeEmbeddingProvider(),
      vectorIndex: new FakeVectorIndex(),
    } as unknown as Container;
    const app = await buildApp(container);

    const response = await app.inject({
      method: 'POST',
      url: '/api/index/evaluate',
      payload: {
        projectPath: projectRoot,
        query: 'add function',
        expectedFiles: ['src/math.ts'],
        expectedSymbols: ['add'],
        limit: 5,
      },
    });

    expect(response.statusCode).toBe(200);
    const report = response.json();
    expect(report.projectId).toBe('web-project');
    expect(report.fixtureName).toBe('web');
    expect(report.totals.filesIndexed).toBe(1);
    expect(report.totals.chunksIndexed).toBe(1);
    expect(report.parserModes.ast).toBe(1);
    expect(report.queries[0].hitTop1).toBe(true);
    expect(report.tokenSavings.method).toBe('approximate');
    await app.close();
  });
});
