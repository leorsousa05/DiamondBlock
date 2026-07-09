# Tasks: Generic Semantic Parsing Engine + TS/JS AST Chunking

## Phase 1 — Ports and contracts

- [x] Create `src/application/ports/code_parser.ts` with `ParsingMode`, `CodeSymbol`, `SymbolRelation`, `ChunkMetadata`, `ParsingResult`, `CodeParser`.
- [x] Create `src/application/ports/parser_registry.ts` with `ParserRegistry`.
- [x] Create `src/application/ports/semantic_chunk_builder.ts` with `SemanticChunkBuilder`.
- [x] Extend `CodeChunkInput` in `src/application/ports/code_chunker.ts` with optional `metadata?: ChunkMetadata`.
- [x] Update `src/domain/code_chunk.ts` and `src/domain/code_chunk.test.ts` to propagate metadata.

## Phase 2 — Smart fallback chunker

- [x] Create `src/infrastructure/smart_fallback_chunker.ts`.
  - [x] Detect delimiters: blank lines, block comments, region markers, markdown headings, YAML/JSON blocks, config sections.
  - [x] Split by delimiters respecting `maxChunkLines` (~300).
  - [x] Fall back to fixed-size windows (~300 lines, ~30 overlap) when no delimiters found.
  - [x] Return chunks with `parsingMode: 'fallback'`, `confidence: 0.35`.
- [x] Create `src/infrastructure/smart_fallback_chunker.test.ts`.

## Phase 3 — TypeScript parser adapter

- [x] Ensure `typescript` dependency is available.
- [x] Create `src/infrastructure/typescript_parser.ts`.
  - [x] Use `ts.createSourceFile` with latest target and TSX support.
  - [x] Traverse nodes and extract functions, arrow functions, classes, interfaces, type aliases, enums, variables (hooks/components), methods.
  - [x] Capture top-level imports.
  - [x] Produce `ParsingResult` with `parsingMode: 'ast'`, `confidence: 0.95`.
- [x] Create `src/infrastructure/typescript_parser.test.ts`.

## Phase 4 — Registry, chunk builder, and pipeline

- [x] Create `src/infrastructure/parser_registry_impl.ts`.
  - [x] Map language to `CodeParser`.
  - [x] Lookup by file extension.
- [x] Create `src/infrastructure/parser_registry_impl.test.ts`.
- [x] Create `src/infrastructure/semantic_chunk_builder_impl.ts`.
  - [x] Build `CodeChunkInput[]` from `ParsingResult`.
  - [x] Prepend standardized header with file path and imports.
  - [x] Attach metadata to each chunk.
- [x] Create `src/infrastructure/semantic_chunk_builder_impl.test.ts`.
- [x] Create `src/infrastructure/parsing_pipeline.ts`.
  - [x] Try registered parser first.
  - [x] Use `SmartFallbackChunker` when no parser available.
  - [x] Always run `SemanticChunkBuilder`.
- [x] Create `src/infrastructure/parsing_pipeline.test.ts`.

## Phase 5 — Integration

- [x] Modify `src/infrastructure/codebase_indexer.ts` to receive `ParsingPipeline` instead of `CodeChunker`.
- [x] Update `src/infrastructure/codebase_indexer.test.ts` if needed.
- [x] Update `src/container_factory.ts` to wire `ParserRegistry`, `SemanticChunkBuilder`, `ParsingPipeline`, and `TypeScriptParser`.

## Phase 6 — Living docs and verification

- [x] Update `specs/living/diamondblock-core.md` with the semantic parsing engine.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Update `specs/changes/007-ast-codebase-indexer/.spec.yaml` status to `completed`.
