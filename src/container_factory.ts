import { join } from 'node:path';
import { FileMemoryRepository } from './infrastructure/file_memory_repository.js';
import { FileSessionRepository } from './infrastructure/file_session_repository.js';
import { SqliteVectorIndex } from './infrastructure/sqlite_vector_index.js';
import { LocalEmbeddingProvider } from './infrastructure/local_embedding_provider.js';
import { OpenAIEmbeddingProvider } from './infrastructure/openai_embedding_provider.js';
import { YamlConfigStore } from './infrastructure/yaml_config_store.js';
import { defaultVaultPath } from './infrastructure/vault_initializer.js';
import type { Container } from './container.js';

export async function createDefaultContainer(vaultPath?: string): Promise<Container> {
  const configStore = new YamlConfigStore();
  const config = await configStore.load();
  const basePath = vaultPath ?? config.vaultPath ?? defaultVaultPath();

  const memoryRepository = new FileMemoryRepository({ basePath });
  const sessionRepository = new FileSessionRepository({ basePath });
  const vectorIndex = new SqliteVectorIndex({ dbPath: join(basePath, 'index', 'embeddings.sqlite') });

  let embeddingProvider;
  if (config.embeddingProvider === 'openai' && config.openaiApiKey) {
    embeddingProvider = new OpenAIEmbeddingProvider({
      apiKey: config.openaiApiKey,
      model: config.openaiEmbeddingModel,
    });
  } else {
    embeddingProvider = new LocalEmbeddingProvider();
  }

  return {
    memoryRepository,
    sessionRepository,
    vectorIndex,
    embeddingProvider,
    configStore,
  };
}
