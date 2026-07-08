import { describe, expect, it } from 'vitest';
import { IndexCodebaseUseCase } from './index_codebase.js';
import type { ProjectInfo, ProjectResolver } from '../ports/project_resolver.js';
import type { SourceFile } from '../ports/codebase_scanner.js';
import type { CodebaseIndexerResult } from '../../infrastructure/codebase_indexer.js';

function fakeProjectResolver(projectId: string): ProjectResolver {
  return {
    async resolve(): Promise<ProjectInfo | null> {
      return { projectId, source: 'cwd' };
    },
  };
}

function fakeScanner(files: SourceFile[]) {
  return {
    async scan() {
      return files;
    },
  };
}

function fakeChunker() {
  return {
    async chunk() {
      return [];
    },
  };
}

function fakeIndexRepository() {
  return {
    async load() {
      return null;
    },
    async save() {},
    async delete() {},
  };
}

function fakeMemoryRepository() {
  return {
    async findById() {
      return null;
    },
    async search() {
      return [];
    },
    async searchWithScore() {
      return [];
    },
    async save() {},
    async delete() {},
    async list() {
      return [];
    },
    resolvePath() {
      return '';
    },
  };
}

function fakeVectorIndex() {
  return {
    async index() {},
    async search() {
      return [];
    },
    async remove() {},
  };
}

function fakeEmbeddingProvider() {
  return {
    async embed() {
      return [];
    },
    async isAvailable() {
      return false;
    },
  };
}

describe('IndexCodebaseUseCase', () => {
  it('resolves project id automatically and returns statistics', async () => {
    const useCase = new IndexCodebaseUseCase(
      fakeProjectResolver('my-project'),
      fakeScanner([{ absolutePath: '/tmp/a.ts', relativePath: 'a.ts' }]),
      fakeChunker(),
      fakeIndexRepository(),
      fakeMemoryRepository(),
      fakeVectorIndex(),
      fakeEmbeddingProvider(),
      () => ({
        async index(): Promise<CodebaseIndexerResult> {
          return {
            added: [{ absolutePath: '/tmp/a.ts', relativePath: 'a.ts' }],
            updated: [],
            removed: [],
            unchanged: [],
            chunksCreated: 3,
            chunksRemoved: 2,
          };
        },
      })
    );

    const result = await useCase.execute({ projectPath: '/tmp/project' });

    expect(result.projectId).toBe('my-project');
    expect(result.scanned).toBe(1);
    expect(result.indexed).toBe(1);
    expect(result.removed).toBe(0);
    expect(result.chunksCreated).toBe(3);
    expect(result.chunksRemoved).toBe(2);
  });

  it('uses explicit project id when provided', async () => {
    const useCase = new IndexCodebaseUseCase(
      fakeProjectResolver('ignored'),
      fakeScanner([]),
      fakeChunker(),
      fakeIndexRepository(),
      fakeMemoryRepository(),
      fakeVectorIndex(),
      fakeEmbeddingProvider(),
      () => ({
        async index(): Promise<CodebaseIndexerResult> {
          return { added: [], updated: [], removed: [], unchanged: [], chunksCreated: 0, chunksRemoved: 0 };
        },
      })
    );

    const result = await useCase.execute({ projectPath: '/tmp/project', projectId: 'Explicit-Project' });

    expect(result.projectId).toBe('explicit-project');
  });

  it('throws when project cannot be resolved', async () => {
    const useCase = new IndexCodebaseUseCase(
      {
        async resolve() {
          return null;
        },
      },
      fakeScanner([]),
      fakeChunker(),
      fakeIndexRepository(),
      fakeMemoryRepository(),
      fakeVectorIndex(),
      fakeEmbeddingProvider()
    );

    await expect(useCase.execute({ projectPath: '/tmp/project' })).rejects.toThrow(
      'Could not resolve project from path'
    );
  });
});
