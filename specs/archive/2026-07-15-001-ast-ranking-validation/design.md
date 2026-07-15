# Design: AST Parser Coverage, Ranking Quality, and Token-Savings Validation

## 7 Analysis Questions

1. **Domain and bounded context placement?**
   This belongs in the existing Codebase Indexing bounded context under `application`, `infrastructure`, and `presentation/cli`. The memory domain remains untouched; evaluation reads indexed chunks and vector results but should not change memory semantics.

2. **Core responsibilities of new/changed components?**
   Parsers produce richer symbol and relation metadata. The evaluator runs fixture indexing/search, computes relevance and token-saving metrics, and returns a report. CLI only triggers the use case and formats its output.

3. **Contracts to define or change?**
   Prefer adding report-specific types and small relation-target extensions rather than widening existing indexer results. `SymbolRelation` may need optional unresolved target data if exact symbol IDs are not available.

4. **Which parts need tests per TDD skip criteria?**
   Tests are required because the work includes branching, parsing logic, filesystem fixtures, vector search, and public CLI behavior. Parser tests, evaluator unit tests, and at least one integration-style fixture evaluation test are required.

5. **Architecture that minimizes ambiguity?**
   Keep Clean Architecture: use cases orchestrate evaluation, ports describe embedding/search dependencies, infrastructure implements parser and local report details. Avoid mixing report calculation directly into CLI or vector index adapters.

6. **Project structure changes needed?**
   Add evaluation use case and possibly application ports for report output/token estimation. Add infrastructure fixtures/helpers under tests or a dedicated fixture directory, plus parser test expansions.

7. **Key trade-offs?**
   Approximate token estimation is fast and dependency-light but less exact than model-specific tokenization. Relation candidates give useful context now but should avoid pretending to be a complete knowledge graph.

## [Padrões Aplicados]

- **Clean Architecture / Hexagonal** — The current project already separates `application/ports`, `application/use_cases`, `domain`, `infrastructure`, and `presentation`. The evaluator should follow the same dependency direction: CLI depends on use cases, use cases depend on ports, infrastructure provides parser/search/token-estimation details.
- **Modular Monolith** — The change is contained inside the existing process and package. There is no reason to introduce services or external orchestration for local evaluation.
- **Strategy Pattern** — Parser selection already uses `ParserRegistry`. Token estimation and fixture evaluation can use swappable strategies without coupling evaluation to a specific tokenizer or embedding provider.
- **Repository Pattern** — Existing chunk/index/vector repositories stay the persistence boundary. Evaluation should consume them through established contracts or create temporary fixture-scoped repositories.
- **CQS/CQRS-lite** — Indexing mutates local vault state, while evaluation report generation should be treated as a query/report flow where possible. If evaluation creates temporary indexes, those side effects must be isolated to temp directories.
- **Test Pyramid** — Parser and metric calculations should be heavily unit-tested. One or two integration tests should cover the full fixture path without creating a brittle e2e surface.
- **Graceful Degradation** — Evaluation must work without remote credentials. If local embeddings are unavailable in a developer machine, tests should use deterministic fake embeddings rather than failing because a model cannot be downloaded.

## [Estratégia de Implementação]

- Preserve existing parser pipeline contracts first, then extend metadata in a backward-compatible way.
- Add richer parser tests before changing parser behavior, especially for default exports, methods, async functions, decorators, imports, inheritance, and relation candidates.
- Add evaluation contracts under `application` so CLI output and future MCP/web reporting can reuse the same report model.
- Implement deterministic fixtures using fake embeddings for tests and real local embeddings only for manual CLI evaluation.
- Calculate token savings as an explicit estimate using a dependency-light estimator at first, such as conservative character/word heuristics, with the type name and CLI label making the approximation clear.
- Keep vector ranking evaluation independent from production indexing reports to avoid bloating `CodebaseIndexerResult`.
- Prefer opt-in CLI surface, for example an `index evaluate` subcommand or `index eval`, so existing index workflows do not change.
- Treat relation extraction as candidate metadata until symbol resolution exists. Avoid false precision by using unresolved target labels when no target symbol ID is known.
- Ensure failures in evaluation provide actionable messages: fixture missing, embeddings unavailable, no chunks indexed, or expected targets absent.

## Target Directory Structure

```text
diamondblock/
├── specs/
│   └── changes/
│       └── 001-ast-ranking-validation/
│           ├── .spec.yaml
│           ├── proposal.md
│           ├── design.md
│           ├── tasks.md
│           └── specs/
│               └── codebase-indexing/
│                   └── spec.md
└── src/
    ├── application/
    │   ├── ports/
    │   │   ├── code_parser.ts
    │   │   └── token_estimator.ts
    │   └── use_cases/
    │       ├── evaluate_codebase_index.ts
    │       └── evaluate_codebase_index.test.ts
    ├── infrastructure/
    │   ├── approximate_token_estimator.ts
    │   ├── codebase_evaluation_fixtures.ts
    │   ├── typescript_parser.ts
    │   ├── typescript_parser.test.ts
    │   ├── python_parser.ts
    │   └── python_parser.test.ts
    └── presentation/
        └── cli/
            └── index.ts
```

The tree shows likely affected files. The engineer may choose more precise names if they fit existing conventions better, but implementation must keep the same architectural boundaries.

## Contracts & Interfaces

### Parser Relation Contract

Current relation type:

```ts
export interface SymbolRelation {
  fromSymbolId: string;
  toSymbolId: string;
  type: 'calls' | 'imports' | 'extends' | 'implements' | 'references';
}
```

Recommended compatible extension:

```ts
export interface SymbolRelation {
  fromSymbolId: string;
  toSymbolId?: string;
  toSymbolName?: string;
  toModuleSpecifier?: string;
  type: 'calls' | 'imports' | 'extends' | 'implements' | 'references';
  confidence?: number;
}
```

Rules:

- `toSymbolId` is required only when the parser can resolve a concrete local symbol ID.
- `toSymbolName` is allowed for unresolved class inheritance, function calls, or type references.
- `toModuleSpecifier` is allowed for import relations.
- `confidence` is optional and should be bounded from `0` to `1`.

### Token Estimator Port

```ts
export interface TokenEstimator {
  estimate(text: string): TokenEstimate;
}

export interface TokenEstimate {
  tokens: number;
  method: 'approximate';
}
```

### Evaluation Query Contract

```ts
export interface CodebaseEvaluationQuery {
  id: string;
  query: string;
  expectedFiles: string[];
  expectedSymbols?: string[];
  limit: number;
}
```

### Evaluation Report Contract

```ts
export interface CodebaseEvaluationReport {
  projectId: string;
  fixtureName: string;
  generatedAt: Date;
  totals: CodebaseEvaluationTotals;
  queries: CodebaseEvaluationQueryResult[];
  parserModes: ParserModeDistribution;
  tokenSavings: TokenSavingsSummary;
}

export interface CodebaseEvaluationTotals {
  filesIndexed: number;
  chunksIndexed: number;
  symbolsIndexed: number;
  relationsIndexed: number;
}

export interface CodebaseEvaluationQueryResult {
  queryId: string;
  query: string;
  expectedFiles: string[];
  expectedSymbols: string[];
  returnedChunkIds: string[];
  returnedFiles: string[];
  hitTop1: boolean;
  hitTop3: boolean;
  hitTop5: boolean;
  retrievedTokenEstimate: number;
  baselineTokenEstimate: number;
  tokenReductionPercent: number;
}

export interface ParserModeDistribution {
  ast: number;
  simplified: number;
  fallback: number;
}

export interface TokenSavingsSummary {
  method: 'approximate';
  averageReductionPercent: number;
  minReductionPercent: number;
  maxReductionPercent: number;
}
```

### Evaluation Use Case Contract

```ts
export interface EvaluateCodebaseIndexInput {
  projectId: string;
  rootPath: string;
  fixtureName?: string;
  queries?: CodebaseEvaluationQuery[];
  limit?: number;
  force?: boolean;
}

export interface EvaluateCodebaseIndexUseCase {
  execute(input: EvaluateCodebaseIndexInput): Promise<CodebaseEvaluationReport>;
}
```

## Data Flow

```text
CLI index evaluate
  -> EvaluateCodebaseIndex use case
    -> CodebaseIndexer indexes fixture/project into isolated or selected vault scope
    -> EmbeddingProvider embeds queries
    -> VectorIndex searches chunks
    -> CodebaseChunkRepository loads chunk details
    -> TokenEstimator estimates retrieved chunk tokens and baseline source tokens
    -> Evaluation report returned to CLI
  -> CLI renders compact table/report
```

## Error Handling

- Missing fixture: return a clear error naming the fixture.
- No chunks indexed: report zero chunks and fail evaluation with a non-success CLI status.
- Embedding unavailable in manual CLI mode: show provider error and suggest local model availability or configured provider.
- Expected target missing from top-k: report as failed metric, not as a thrown exception.
- Parser failure: preserve existing fallback behavior where configured and surface parser mode distribution.

## Test Plan

- Unit tests for `ApproximateTokenEstimator` with empty, short, and large text.
- Unit tests for evaluation metric calculation: top-1/top-3/top-5, average/min/max token reduction, parser-mode distribution.
- TypeScript parser tests for default export functions/classes, class methods, arrow-function components/hooks, enums, type aliases, and import/extends/implements relation candidates.
- Python parser tests for async functions, decorators, class inheritance, methods, imports, and fallback-on-error behavior.
- Integration-style test with a fixture project using fake deterministic embeddings to validate the full evaluation report shape.
- CLI test or command parser test if existing CLI tests support it; otherwise cover CLI formatting via a pure formatting helper.

## Subagent Parallelization Plan

Parallel implementation is approved because the work can split across separate files with controlled contracts.

- `ast-parser-improvements` owns parser behavior and parser tests.
- `ranking-evaluation` owns evaluation contracts, token estimator, fixtures, and use-case tests.
- `cli-reporting` owns CLI command wiring after the report contract is available.

Coordination point: agree on the final `CodebaseEvaluationReport` and optional `SymbolRelation` extension before parallel work starts.

## Deferred Items

- Full symbol graph with exact cross-file resolution.
- New AST language adapters.
- Web dashboard evaluation UI.
- Model-specific tokenizer integration.
- Persistent historical evaluation trend tracking.
