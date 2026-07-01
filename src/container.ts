import type { MemoryRepository } from './application/ports/memory_repository.js';
import type { SessionRepository } from './application/ports/session_repository.js';
import type { VectorIndex } from './application/ports/vector_index.js';
import type { EmbeddingProvider } from './application/ports/embedding_provider.js';
import type { ConfigStore } from './application/ports/config_store.js';

export interface Container {
  memoryRepository: MemoryRepository;
  sessionRepository: SessionRepository;
  vectorIndex: VectorIndex;
  embeddingProvider: EmbeddingProvider;
  configStore: ConfigStore;
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
