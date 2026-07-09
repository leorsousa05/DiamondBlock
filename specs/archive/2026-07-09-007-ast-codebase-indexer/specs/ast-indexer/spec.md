---
created_at: 2026-07-08
updated_at: 2026-07-08
---

# Spec Delta: AST Codebase Indexer

## ADDED

### Domain model

- `ParsingResult` — output of any parser, language-agnostic.
- `CodeSymbol` — represents a function, class, interface, method, component, hook, etc.
- `SymbolRelation` — typed relationship between symbols (deferred to Milestone 3, but type reserved).
- `ChunkMetadata` — confidence, parsing mode, symbol references, imports, language, framework hints.

### Application ports

- `CodeParser` — generic parser port.
- `ParserRegistry` — resolves the right parser for a file.
- `SemanticChunkBuilder` — builds chunks from a `ParsingResult`.

### Infrastructure adapters

- `TypeScriptParser` — AST parser for `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`.
- `SmartFallbackChunker` — delimiter-aware chunker for unsupported files.
- `ParsingPipeline` — orchestrates cascade: AST → simplified → fallback.

### Integration

- `CodebaseIndexer` uses `ParsingPipeline` instead of `LineCodeChunker` directly.
- `container_factory.ts` wires `ParserRegistry`, `SemanticChunkBuilder`, and `ParsingPipeline`.

## MODIFIED

- `src/application/ports/code_chunker.ts` — may extend `CodeChunkInput` with optional metadata field.
- `src/domain/code_chunk.ts` — `CodeChunkInput` now carries optional metadata.
- `src/infrastructure/codebase_indexer.ts` — replace direct `chunker.chunk` call with `parsingPipeline.process`.
- `src/infrastructure/line_code_chunker.ts` — kept as a legacy/simple fallback option, not the default.
- `specs/living/diamondblock-core.md` — document the new semantic parsing engine.

## REMOVED

- Nothing removed; `LineCodeChunker` remains available for explicit use or legacy behavior.
