import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { CodebaseIndexer } from './codebase_indexer.js';
import { FileCodebaseScanner } from './file_codebase_scanner.js';
import { ParserRegistryImpl } from './parser_registry_impl.js';
import { TypeScriptParser } from './typescript_parser.js';
import { SmartFallbackChunker } from './smart_fallback_chunker.js';
import { SemanticChunkBuilderImpl } from './semantic_chunk_builder_impl.js';
import { ParsingPipeline } from './parsing_pipeline.js';
import { FileCodebaseIndexRepository } from './file_codebase_index_repository.js';
import { FileCodebaseChunkRepository } from './file_codebase_chunk_repository.js';
import { SqliteVectorIndex } from './sqlite_vector_index.js';

class FakeEmbeddingProvider {
  async embed(_text: string): Promise<number[]> {
    return Array.from({ length: 384 }, () => Math.random());
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

describe('CodebaseIndexer', () => {
  let projectRoot: string;
  let vaultPath: string;
  let indexer: CodebaseIndexer;
  let codebaseChunkRepository: FileCodebaseChunkRepository;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'db-proj-'));
    vaultPath = await mkdtemp(join(tmpdir(), 'db-vault-'));

    codebaseChunkRepository = new FileCodebaseChunkRepository({ basePath: vaultPath });
    const vectorIndex = new SqliteVectorIndex({ dbPath: join(vaultPath, 'index', 'embeddings.sqlite') });
    const indexRepository = new FileCodebaseIndexRepository({ basePath: vaultPath });

    const registry = new ParserRegistryImpl();
    registry.register('typescript', new TypeScriptParser());

    indexer = new CodebaseIndexer({
      scanner: new FileCodebaseScanner(),
      pipeline: new ParsingPipeline({
        registry,
        fallbackChunker: new SmartFallbackChunker(),
        semanticChunkBuilder: new SemanticChunkBuilderImpl(),
      }),
      indexRepository,
      codebaseChunkRepository,
      vectorIndex,
      embeddingProvider: new FakeEmbeddingProvider(),
    });
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
    await rm(vaultPath, { recursive: true, force: true });
  });

  async function writeProjectFile(relativePath: string, content: string): Promise<void> {
    const absolutePath = join(projectRoot, relativePath);
    await mkdir(absolutePath.split('/').slice(0, -1).join('/'), { recursive: true });
    await writeFile(absolutePath, content, 'utf-8');
  }

  it('indexes all files on first run', async () => {
    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3');
    await writeProjectFile('src/bar.ts', 'line1\nline2');

    const result = await indexer.index('my-project', projectRoot);

    expect(result.added).toHaveLength(2);
    expect(result.updated).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  it('detects unchanged files on second run', async () => {
    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3');
    await indexer.index('my-project', projectRoot);

    const result = await indexer.index('my-project', projectRoot);

    expect(result.added).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(1);
  });

  it('detects updated files', async () => {
    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3');
    await indexer.index('my-project', projectRoot);

    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3\nline4');
    const result = await indexer.index('my-project', projectRoot);

    expect(result.updated).toHaveLength(1);
    expect(result.unchanged).toHaveLength(0);
  });

  it('detects removed files and deletes their chunks', async () => {
    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3');
    await writeProjectFile('src/bar.ts', 'line1\nline2');
    await indexer.index('my-project', projectRoot);

    await rm(join(projectRoot, 'src/bar.ts'), { force: true });
    const result = await indexer.index('my-project', projectRoot);

    expect(result.removed).toHaveLength(1);
    expect(result.removed[0]).toBe('src/bar.ts');
  });

  it('supports dry-run mode', async () => {
    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3');

    const result = await indexer.index('my-project', projectRoot, { dryRun: true });

    expect(result.added).toHaveLength(1);

    const manifest = await new FileCodebaseIndexRepository({ basePath: vaultPath }).load('my-project');
    expect(manifest).toBeNull();
  });

  it('supports force mode', async () => {
    await writeProjectFile('src/foo.ts', 'line1\nline2\nline3');
    await indexer.index('my-project', projectRoot);

    const result = await indexer.index('my-project', projectRoot, { force: true });

    expect(result.updated).toHaveLength(1);
    expect(result.unchanged).toHaveLength(0);
  });

  it('saves chunks to the codebase chunk repository', async () => {
    await writeProjectFile('src/foo.ts', 'export function add(a: number, b: number): number {\n  return a + b;\n}');
    await indexer.index('my-project', projectRoot);

    const chunks = await codebaseChunkRepository.list({ projectId: 'my-project' });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.projectId).toBe('my-project');
    expect(chunks[0]?.source).toBe('codebase-indexer');
  });

  it('treats a legacy manifest with memoryIds as a full reindex', async () => {
    await writeProjectFile('src/foo.ts', 'export function add(a: number, b: number): number {\n  return a + b;\n}');

    const legacyManifest = {
      projectId: 'my-project',
      rootPath: projectRoot,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: {
        'src/foo.ts': {
          relativePath: 'src/foo.ts',
          contentHash: 'oldhash',
          indexedAt: new Date().toISOString(),
          memoryIds: ['chunk_legacy'],
        },
      },
    };

    const indexRepository = new FileCodebaseIndexRepository({ basePath: vaultPath });
    await indexRepository.save(legacyManifest as unknown as import('../application/ports/codebase_index_repository.js').CodebaseIndexManifest);

    const result = await indexer.index('my-project', projectRoot);

    expect(result.added).toHaveLength(1);
    expect(result.updated).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);

    const loaded = await indexRepository.load('my-project');
    expect(loaded?.files['src/foo.ts']?.chunkIds.length).toBeGreaterThan(0);
    expect('memoryIds' in (loaded?.files['src/foo.ts'] ?? {})).toBe(false);
  });
});
