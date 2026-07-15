# Tasks: AST Parser Coverage, Ranking Quality, and Token-Savings Validation

## Phase 1: Baseline Verification

- [x] Run `npm test` to capture the current baseline.
- [x] Run `npm run typecheck` to capture the current type baseline.
- [x] Run `npm run build` if local web dependencies are present and buildable.
- [x] Record any pre-existing failures before implementation changes.

## Phase 2: Parser Contract and Tests

- [x] Extend `SymbolRelation` to support unresolved relation candidates without breaking existing callers.
- [x] Add TypeScript parser tests for default exports, class methods, `extends`, `implements`, imports, components, hooks, enums, and type aliases.
- [x] Add Python parser tests for async functions, decorators, class inheritance, methods, and imports.
- [x] Ensure parser tests assert metadata confidence and parsing mode where relevant.

## Phase 3: Parser Implementation Improvements

- [x] Improve TypeScript parser relation candidate extraction for imports, extends, and implements.
- [x] Improve TypeScript symbol extraction only where it adds high-signal chunks and avoids noisy local declarations.
- [x] Improve Python parser extraction for async functions, decorators, inheritance relation candidates, and import metadata.
- [x] Preserve fallback behavior for parse errors.

## Phase 4: Evaluation Contracts and Metrics

- [x] Add a token estimator port with explicit approximate semantics.
- [x] Implement a dependency-light approximate token estimator.
- [x] Add evaluation report types for totals, query results, parser modes, and token savings.
- [x] Add metric calculation tests for hit top-k and token reduction summaries.

## Phase 5: Evaluation Use Case

- [x] Add deterministic fixture definitions with representative queries and expected targets.
- [x] Implement `EvaluateCodebaseIndex` use case using existing indexer, embedding provider, vector index, and chunk repository boundaries.
- [x] Ensure tests can use deterministic fake embeddings and temporary vault/project directories.
- [x] Add integration-style test for a full evaluation report.

## Phase 6: CLI Reporting

- [x] Add an opt-in CLI entry point such as `dblock index evaluate` or equivalent.
- [x] Render a compact report with files/chunks, parser-mode distribution, top-k hit metrics, and approximate token savings.
- [x] Keep existing `dblock index` commands backward compatible.
- [x] Add CLI formatting tests where feasible.

## Phase 7: Verification

- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build` if available in the local environment.
- [x] Manually run the evaluation command against a small fixture or this repository.
- [x] Confirm the report answers whether DiamondBlock is saving tokens and where AST parsing still falls back.

## Acceptance Checklist

- [x] Evaluation runs locally without external credentials.
- [x] Token savings are reported as estimates.
- [x] Search quality includes top-1/top-3/top-5 hits.
- [x] Parser-mode distribution shows AST/simplified/fallback percentages.
- [x] TypeScript and Python parser coverage is stronger than before.
- [x] Existing public behavior remains compatible.
- [x] Living spec deferred items can be updated after implementation completes.
