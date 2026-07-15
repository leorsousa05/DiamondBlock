import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EvaluateCodebaseIndexUseCase } from './evaluate_codebase_index.js';
import { FileCodebaseScanner } from '../../infrastructure/file_codebase_scanner.js';
import { ParserRegistryImpl } from '../../infrastructure/parser_registry_impl.js';
import { TypeScriptParser } from '../../infrastructure/typescript_parser.js';
import { PythonParser } from '../../infrastructure/python_parser.js';
import { SmartFallbackChunker } from '../../infrastructure/smart_fallback_chunker.js';
import { SemanticChunkBuilderImpl } from '../../infrastructure/semantic_chunk_builder_impl.js';
import { ParsingPipeline } from '../../infrastructure/parsing_pipeline.js';
import { FileCodebaseIndexRepository } from '../../infrastructure/file_codebase_index_repository.js';
import { FileCodebaseChunkRepository } from '../../infrastructure/file_codebase_chunk_repository.js';
import { ApproximateTokenEstimator } from '../../infrastructure/approximate_token_estimator.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { SearchResult, VectorIndex, VectorIndexable } from '../ports/vector_index.js';

const EMBEDDING_DIMENSION = 64;

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 31 + token.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % EMBEDDING_DIMENSION;
}

function bagOfWordsEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  for (const token of tokenize(text)) {
    vector[hashToken(token)] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude === 0 ? vector : vector.map((value) => value / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

class FakeEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    return bagOfWordsEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(bagOfWordsEmbedding);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

class FakeVectorIndex implements VectorIndex {
  private readonly entries = new Map<string, { item: VectorIndexable; embedding: number[] }>();

  async index(item: VectorIndexable, embedding: number[]): Promise<void> {
    this.entries.set(item.id, { item, embedding });
  }

  async indexBatch(items: Array<{ item: VectorIndexable; embedding: number[] }>): Promise<void> {
    for (const { item, embedding } of items) {
      this.entries.set(item.id, { item, embedding });
    }
  }

  async search(embedding: number[], limit: number, options?: { scope?: string }): Promise<SearchResult[]> {
    return [...this.entries.values()]
      .filter((entry) => !options?.scope || entry.item.scope === options.scope)
      .map((entry) => ({ id: entry.item.id, score: cosineSimilarity(embedding, entry.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async remove(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async removeBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.entries.delete(id);
    }
  }
}

describe('EvaluateCodebaseIndexUseCase', () => {
  let projectRoot: string;
  let vaultPath: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'db-eval-proj-'));
    vaultPath = await mkdtemp(join(tmpdir(), 'db-eval-vault-'));
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

  it('reports parser modes, top-k hits, and approximate token savings', async () => {
    await writeProjectFile('src/math.ts', "import { round } from './rounding';\n\nexport function add(a: number, b: number): number {\n  return round(a + b);\n}");
    await writeProjectFile('src/rounding.ts', 'export function round(value: number): number {\n  return Math.round(value);\n}');
    await writeProjectFile('src/tax.py', 'class TaxCalculator:\n    def calculate(self, income):\n        return income * 0.1\n');

    const registry = new ParserRegistryImpl();
    registry.register('typescript', new TypeScriptParser());
    registry.register('python', new PythonParser());

    const useCase = new EvaluateCodebaseIndexUseCase({
      scanner: new FileCodebaseScanner(),
      pipeline: new ParsingPipeline({
        registry,
        fallbackChunker: new SmartFallbackChunker(),
        semanticChunkBuilder: new SemanticChunkBuilderImpl(),
      }),
      indexRepository: new FileCodebaseIndexRepository({ basePath: vaultPath }),
      codebaseChunkRepository: new FileCodebaseChunkRepository({ basePath: vaultPath }),
      vectorIndex: new FakeVectorIndex(),
      embeddingProvider: new FakeEmbeddingProvider(),
      tokenEstimator: new ApproximateTokenEstimator(),
    });

    const report = await useCase.execute({
      projectId: 'eval-project',
      rootPath: projectRoot,
      fixtureName: 'unit-fixture',
      queries: [
        {
          id: 'math-add',
          query: 'add function round numbers',
          expectedFiles: ['src/math.ts'],
          expectedSymbols: ['add'],
          limit: 5,
        },
      ],
      force: true,
    });

    expect(report.projectId).toBe('eval-project');
    expect(report.fixtureName).toBe('unit-fixture');
    expect(report.totals.filesIndexed).toBe(3);
    expect(report.totals.chunksIndexed).toBeGreaterThan(0);
    expect(report.totals.relationsIndexed).toBeGreaterThan(0);
    expect(report.parserModes.ast).toBeGreaterThan(0);
    expect(report.queries[0].hitTop1).toBe(true);
    expect(report.queries[0].returnedFiles[0]).toBe('src/math.ts');
    expect(report.queries[0].hitTop5).toBe(true);
    expect(report.queries[0].retrievedTokenEstimate).toBeGreaterThan(0);
    expect(report.tokenSavings.method).toBe('approximate');
  });
});
