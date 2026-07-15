# Proposal: AST Parser Coverage, Ranking Quality, and Token-Savings Validation

## Summary

DiamondBlock already has a strong local-first memory and codebase indexing foundation: code chunks are stored separately from user memories, embeddings are generated locally by default, and the parsing pipeline supports AST mode for TypeScript/JavaScript and Python with fallback chunking for other files. The next highest-value work is not adding many new languages immediately; it is proving that the current indexer saves tokens in real use and tightening the semantic quality of the supported AST parsers.

This change introduces a measurable validation layer for code-search relevance and token savings, while improving AST metadata where the current implementation is visibly incomplete. The work should preserve the existing Clean Architecture shape: application use cases orchestrate behavior, infrastructure adapters implement parsing/evaluation details, and presentation remains limited to CLI/MCP/web entry points.

## Motivation

The user asked whether the project is good, whether it saves tokens, and whether ASTs are implemented. Read-only inspection showed that TypeScript and Python AST parsing exists, but relation extraction is stubbed with empty `relations`, TypeScript parser coverage is limited to top-level declarations, Python relation metadata is minimal, and there is no deterministic quality harness showing token reduction or retrieval relevance.

Without a repeatable evaluation harness, future parser and ranking changes can feel subjectively better while silently making retrieval worse. DiamondBlock needs a compact local benchmark that can answer: “for these representative queries, did we retrieve the right code in fewer tokens than sending broad source files?”

## Goals

- Validate real token savings from codebase indexing versus broader source inclusion.
- Improve AST parser output for TypeScript/JavaScript and Python before adding more language adapters.
- Add deterministic evaluation fixtures for semantic search relevance.
- Keep all evaluation local-first and offline-friendly.
- Preserve current CLI, MCP, repository, and vector index behavior unless explicitly extended.
- Provide clear implementation tasks for an engineer to execute safely.

## Non-Goals

- Do not implement parsers for Go, Rust, Java, PHP, or other new languages in this change.
- Do not add cloud sync or remote telemetry.
- Do not introduce OpenAI as a required dependency for evaluation.
- Do not redesign the vector database schema unless an implementation blocker appears.
- Do not build UI changes for the web dashboard in this change.

## Current State

Relevant files discovered during architectural inspection:

```text
diamondblock/
├── package.json
├── README.md
├── specs/
│   └── living/
│       └── diamondblock-core.md
└── src/
    ├── application/
    │   ├── ports/
    │   │   ├── code_parser.ts
    │   │   ├── parser_registry.ts
    │   │   ├── semantic_chunk_builder.ts
    │   │   ├── vector_index.ts
    │   │   └── embedding_provider.ts
    │   └── use_cases/
    │       └── index_codebase.ts
    ├── domain/
    │   └── code_chunk.ts
    ├── infrastructure/
    │   ├── codebase_indexer.ts
    │   ├── parsing_pipeline.ts
    │   ├── typescript_parser.ts
    │   ├── python_parser.ts
    │   ├── simplified_parser.ts
    │   ├── smart_fallback_chunker.ts
    │   ├── semantic_chunk_builder_impl.ts
    │   ├── sqlite_vector_index.ts
    │   └── *_test.ts
    └── presentation/
        └── cli/
            └── index.ts
```

## Proposed Scope

The change has three coordinated tracks.

Track one improves parser output for the existing AST languages. TypeScript should capture more useful symbol boundaries and relations without overcomplicating the first pass. Python should expose basic import/class inheritance/decorator metadata where tree-sitter already provides reliable nodes.

Track two adds an evaluation use case that runs against deterministic local fixtures. It should report retrieval hit rate, top-k accuracy, approximate token savings, chunk counts, parser-mode distribution, and fallback percentage.

Track three exposes the evaluation through developer-facing CLI ergonomics so maintainers can run it before and after parser/ranking changes.

## Success Criteria

- Running the evaluation produces a deterministic report without network access.
- The report includes token-saving estimates comparing indexed chunks to a broad source baseline.
- The report includes retrieval quality metrics for predefined queries and expected files/symbols.
- TypeScript parser tests cover top-level functions/classes/interfaces/types/enums/components/hooks, methods when useful, default exports, and relation candidates.
- Python parser tests cover functions, classes, methods, decorators, imports, async functions, and relation candidates.
- Existing tests still pass.
- Existing CLI and MCP behavior remains backward compatible.

## Risks

- Approximate token counting can be misleading if presented as exact model tokenization. The report must call it an estimate unless a tokenizer is later introduced.
- Relation extraction can grow into a full static-analysis project. The first version should record low-risk relation candidates only.
- Evaluation fixtures can overfit. Fixtures should reflect real project patterns in DiamondBlock: parser files, use cases, repositories, CLI commands, and tests.
- Local embeddings may be slow on first run because model loading is expensive. The evaluation should separate cold-start timing from steady-state metrics if timing is reported.

## Requirement Traceability

- Addressed: “O que fazer agora?” by defining the next executable improvement package.
- Addressed: token economy by requiring measurable token-saving evaluation.
- Addressed: AST status by focusing on TypeScript/Python AST improvements before adding new languages.
- Deferred: new language AST adapters because quality validation should come first.
- Deferred: web UI reporting because the requested next step is technical validation, not dashboard work.
