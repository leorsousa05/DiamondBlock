# Design: Web Index Evaluation

## Architecture

The existing modular-monolith and Clean Architecture boundaries remain unchanged. The Fastify route adapts HTTP input to `EvaluateCodebaseIndexUseCase`; the React client owns request/response types; `IndexPage` renders the report using established cards, tabs, forms, tables, and badges.

## [Padrões Aplicados]

- **Adapter**: Fastify translates HTTP payloads into the existing application use case.
- **Reuse over duplication**: the Web UI consumes the same evaluator used by CLI.
- **Progressive disclosure**: evaluation lives in a dedicated tab and does not crowd normal indexing.
- **Graceful degradation**: API errors remain inline and do not discard the previous report.

## [Estratégia de Implementação]

1. Validate query, limit, project resolution, and required container dependencies in the route.
2. Execute the existing evaluator synchronously; incremental indexing makes normal reruns inexpensive.
3. Add typed client contracts matching `CodebaseEvaluationReport`.
4. Add an `Evaluate` tab with a compact form and report summary.
5. Surface parser mode and relation count in the chunks table.
6. Verify route behavior, application tests, web typecheck, and production build.

## HTTP Contract

```ts
interface EvaluateIndexBody {
  projectPath?: string;
  projectId?: string;
  query: string;
  expectedFiles?: string[];
  expectedSymbols?: string[];
  limit?: number;
  force?: boolean;
}
```

`POST /api/index/evaluate` returns `CodebaseEvaluationReport`. Validation errors return `400`; unavailable index infrastructure returns `503`; evaluator failures return `500` with a concise error.

## Visual Specification

- Add `Evaluate` as the third tab after `Chunks`.
- Reuse current dark theme, spacing, typography, `stat-card`, form, table, alert, and badge styles.
- Primary form contains query, project path, expected files/symbols, result limit, and force toggle.
- Summary cards show files, chunks, relations, and average estimated token reduction.
- Parser coverage is a three-part strip for AST, simplified, and fallback counts.
- Query results show top-k outcomes and retrieved/baseline token estimates.
- Layout uses existing responsive grids and wraps on narrow screens.

## Testing

- Route rejects missing query.
- Route rejects unavailable infrastructure.
- Route returns a complete report for a temporary fixture project.
- Existing evaluator tests continue proving deterministic ranking.
- Web TypeScript build validates client/report composition.

## Risks

- Evaluation can take time on first local-model load; synchronous HTTP is acceptable for this first UI surface and SSE is deferred.
- Token savings remain explicitly approximate.
