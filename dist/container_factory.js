import { join } from 'node:path';
import { FileMemoryRepository } from './infrastructure/file_memory_repository.js';
import { FileSessionRepository } from './infrastructure/file_session_repository.js';
import { SqliteVectorIndex } from './infrastructure/sqlite_vector_index.js';
import { LocalEmbeddingProvider } from './infrastructure/local_embedding_provider.js';
import { OpenAIEmbeddingProvider } from './infrastructure/openai_embedding_provider.js';
import { YamlConfigStore } from './infrastructure/yaml_config_store.js';
import { LocalEnrichmentProvider } from './infrastructure/local_enrichment_provider.js';
import { MemoryEnrichmentService } from './domain/services/memory_enrichment.js';
import { OrphanedChunkCleaner } from './domain/services/orphaned_chunk_cleaner.js';
import { defaultVaultPath } from './infrastructure/vault_initializer.js';
import { CwdProjectResolver } from './infrastructure/cwd_project_resolver.js';
import { FileCodebaseScanner } from './infrastructure/file_codebase_scanner.js';
import { FileCodebaseChunkRepository } from './infrastructure/file_codebase_chunk_repository.js';
import { ParserRegistryImpl } from './infrastructure/parser_registry_impl.js';
import { TypeScriptParser } from './infrastructure/typescript_parser.js';
import { PythonParser } from './infrastructure/python_parser.js';
import { SimplifiedParser } from './infrastructure/simplified_parser.js';
import { pythonPatterns } from './infrastructure/language_patterns/python_patterns.js';
import { SmartFallbackChunker } from './infrastructure/smart_fallback_chunker.js';
import { SemanticChunkBuilderImpl } from './infrastructure/semantic_chunk_builder_impl.js';
import { ParsingPipeline } from './infrastructure/parsing_pipeline.js';
import { FileCodebaseIndexRepository } from './infrastructure/file_codebase_index_repository.js';
export async function createDefaultContainer(vaultPath) {
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
    }
    else {
        embeddingProvider = new LocalEmbeddingProvider();
    }
    const enrichmentProvider = new LocalEnrichmentProvider();
    const enrichmentService = new MemoryEnrichmentService(memoryRepository, vectorIndex, embeddingProvider, enrichmentProvider, { confidenceThreshold: 0.5, maxTags: 10, maxEntities: 10 });
    const projectResolver = new CwdProjectResolver({ configStore });
    const codebaseScanner = new FileCodebaseScanner();
    const parserRegistry = new ParserRegistryImpl();
    parserRegistry.register('typescript', new TypeScriptParser());
    const pythonSimplifiedParser = new SimplifiedParser({ patterns: pythonPatterns, confidence: 0.65 });
    parserRegistry.register('python', new PythonParser({
        fallbackOnError: true,
        simplifiedParser: pythonSimplifiedParser,
    }));
    parserRegistry.register('python-simplified', pythonSimplifiedParser);
    const fallbackChunker = new SmartFallbackChunker();
    const semanticChunkBuilder = new SemanticChunkBuilderImpl();
    const parsingPipeline = new ParsingPipeline({
        registry: parserRegistry,
        fallbackChunker,
        semanticChunkBuilder,
    });
    const codebaseIndexRepository = new FileCodebaseIndexRepository({ basePath });
    const codebaseChunkRepository = new FileCodebaseChunkRepository({ basePath });
    const orphanedChunkCleaner = new OrphanedChunkCleaner({
        codebaseChunkRepository,
        vectorIndex,
        codebaseIndexRepository,
    });
    return {
        memoryRepository,
        sessionRepository,
        vectorIndex,
        embeddingProvider,
        configStore,
        projectResolver,
        enrichmentService,
        codebaseScanner,
        parsingPipeline,
        codebaseIndexRepository,
        codebaseChunkRepository,
        orphanedChunkCleaner,
    };
}
//# sourceMappingURL=container_factory.js.map