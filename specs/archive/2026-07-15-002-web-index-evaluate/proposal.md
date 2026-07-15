# Proposal: Web Index Evaluation

## Objective

Expose the index-quality capabilities introduced by change 001 in `dblock web`, so users can measure search relevance, parser coverage, relation extraction, and approximate token savings without using the CLI.

## Scope

- Add a synchronous `POST /api/index/evaluate` endpoint.
- Add an `Evaluate` tab to the existing Codebase Index page.
- Accept project path, query, expected files/symbols, result limit, and force-reindex options.
- Display index totals, parser modes, relation count, top-k hits, and token estimates.
- Show parser mode and relation count in the existing chunks table.
- Preserve all existing index routes and UI behavior.

## Non-Goals

- Historical evaluation reports.
- Multi-query fixture management in the UI.
- SSE progress for evaluation.
- Exact model-specific tokenization.

## Success Criteria

- Evaluation can be executed from the Web UI against a selected project path.
- Results clearly identify estimates and top-1/top-3/top-5 outcomes.
- AST, simplified, and fallback chunk counts are visible.
- Existing web and backend tests, typecheck, and build pass.
