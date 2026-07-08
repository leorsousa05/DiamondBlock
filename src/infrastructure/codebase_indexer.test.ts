import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { CodebaseIndexer } from './codebase_indexer.js';
import { FileCodebaseScanner } from './file_codebase_scanner.js';
import { LineCodeChunker } from './line_code_chunker.js';
import { FileCodebaseIndexRepository } from './file_codebase_index_repository.js';
import { FileMemoryRepository } from './file_memory_repository.js';
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

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'db-proj-'));
    vaultPath = await mkdtemp(join(tmpdir(), 'db-vault-'));

    const memoryRepository = new FileMemoryRepository({ basePath: vaultPath });
    const vectorIndex = new SqliteVectorIndex({ dbPath: join(vaultPath, 'index', 'embeddings.sqlite') });
    const indexRepository = new FileCodebaseIndexRepository({ basePath: vaultPath });

    indexer = new CodebaseIndexer({
      scanner: new FileCodebaseScanner(),
      chunker: new LineCodeChunker(),
      indexRepository,
      memoryRepository,
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

  it('detects removed files and deletes their memories', async () => {
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
});
