import type { CodebaseEvaluationQuery, CodebaseEvaluationReport } from '../ports/codebase_evaluation.js';
import type { CodebaseChunkRepository } from '../ports/codebase_chunk_repository.js';
import type { CodebaseIndexRepository } from '../ports/codebase_index_repository.js';
import type { CodebaseScanner } from '../ports/codebase_scanner.js';
import type { EmbeddingProvider } from '../ports/embedding_provider.js';
import type { TokenEstimator } from '../ports/token_estimator.js';
import type { VectorIndex } from '../ports/vector_index.js';
import type { ParsingPipeline } from '../../infrastructure/parsing_pipeline.js';
export interface EvaluateCodebaseIndexInput {
    projectId: string;
    rootPath: string;
    fixtureName?: string;
    queries?: CodebaseEvaluationQuery[];
    limit?: number;
    force?: boolean;
}
export interface EvaluateCodebaseIndexOptions {
    scanner: CodebaseScanner;
    pipeline: ParsingPipeline;
    indexRepository: CodebaseIndexRepository;
    codebaseChunkRepository: CodebaseChunkRepository;
    vectorIndex: VectorIndex;
    embeddingProvider: EmbeddingProvider;
    tokenEstimator: TokenEstimator;
}
export declare class EvaluateCodebaseIndexUseCase {
    private readonly options;
    constructor(options: EvaluateCodebaseIndexOptions);
    execute(input: EvaluateCodebaseIndexInput): Promise<CodebaseEvaluationReport>;
    private loadChunks;
    private evaluateQuery;
    private readBaselineText;
    private hasHit;
    private countParserModes;
    private summarizeTokenSavings;
    private reductionPercent;
}
//# sourceMappingURL=evaluate_codebase_index.d.ts.map