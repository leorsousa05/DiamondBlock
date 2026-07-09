import type { CodebaseScanner } from '../application/ports/codebase_scanner.js';
import type { ParsingPipeline } from './parsing_pipeline.js';
import type { CodebaseIndexRepository } from '../application/ports/codebase_index_repository.js';
import type { CodebaseChunkRepository } from '../application/ports/codebase_chunk_repository.js';
import type { VectorIndex } from '../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../application/ports/embedding_provider.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
export interface CodebaseIndexerOptions {
    scanner: CodebaseScanner;
    pipeline: ParsingPipeline;
    indexRepository: CodebaseIndexRepository;
    codebaseChunkRepository: CodebaseChunkRepository;
    vectorIndex: VectorIndex;
    embeddingProvider: EmbeddingProvider;
}
export interface CodebaseIndexerProgress {
    onScanStart?(): void;
    onScanComplete?(files: SourceFile[]): void;
    onFileStart?(file: SourceFile, current: number, total: number): void;
    onFileComplete?(file: SourceFile, chunks: number, current: number, total: number): void;
    onSavingStart?(): void;
    onSavingComplete?(): void;
}
export interface CodebaseIndexerResult {
    added: SourceFile[];
    updated: SourceFile[];
    removed: string[];
    unchanged: SourceFile[];
    chunksCreated: number;
    chunksRemoved: number;
}
export declare class CodebaseIndexer {
    private readonly options;
    constructor(options: CodebaseIndexerOptions);
    index(projectId: string, rootPath: string, options?: {
        force?: boolean;
        dryRun?: boolean;
        progress?: CodebaseIndexerProgress;
    }): Promise<CodebaseIndexerResult>;
    private hasLegacyMemoryIds;
    private computeHashes;
    private indexFile;
    private removeChunks;
}
//# sourceMappingURL=codebase_indexer.d.ts.map