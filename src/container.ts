import type { MemoryRepository } from './application/ports/memory_repository.js';
import type { SessionRepository } from './application/ports/session_repository.js';
import type { VectorIndex } from './application/ports/vector_index.js';
import type { EmbeddingProvider } from './application/ports/embedding_provider.js';
import type { ConfigStore } from './application/ports/config_store.js';
import type { MemoryEnrichmentService } from './domain/services/memory_enrichment.js';

import type { ProjectResolver } from './application/ports/project_resolver.js';
import type { CodebaseScanner } from './application/ports/codebase_scanner.js';
import type { CodeChunker } from './application/ports/code_chunker.js';
import type { CodebaseIndexRepository } from './application/ports/codebase_index_repository.js';

export interface Container {
  memoryRepository: MemoryRepository;
  sessionRepository: SessionRepository;
  vectorIndex: VectorIndex;
  embeddingProvider: EmbeddingProvider;
  configStore: ConfigStore;
  projectResolver: ProjectResolver;
  enrichmentService?: MemoryEnrichmentService;
  codebaseScanner?: CodebaseScanner;
  codeChunker?: CodeChunker;
  codebaseIndexRepository?: CodebaseIndexRepository;
}

let container: Container | null = null;

export function setContainer(c: Container): void {
  container = c;
}

export function getContainer(): Container {
  if (!container) {
    throw new Error('Container not initialized');
  }
  return container;
}
