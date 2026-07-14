# Spec Delta: Simplified Parser & Python Adapter

## Current State

The parsing layer consists of:

- `CodeParser` port in `src/application/ports/code_parser.ts` with `ParsingResult`, `CodeSymbol`, `SymbolRelation`, `ChunkMetadata`.
- `TypeScriptParser` adapter in `src/infrastructure/typescript_parser.ts` for TS/JS files.
- `SmartFallbackChunker` in `src/infrastructure/smart_fallback_chunker.ts` for all unsupported files.
- `ParsingPipeline` in `src/infrastructure/parsing_pipeline.ts` that asks `ParserRegistry` for a parser; if none matches, it uses the fallback chunker.
- `ParserRegistryImpl` in `src/infrastructure/parser_registry_impl.ts` registered only with `TypeScriptParser`.
- `SemanticChunkBuilderImpl` enriches chunks with imports and headers.

Any file that is not TypeScript/JavaScript is currently processed by `SmartFallbackChunker` with low confidence and no symbol metadata.

## Changes

### ADDED

- `src/application/ports/language_pattern.ts` — `LanguagePatternSet` and `LanguagePattern` contracts for regex-based simplified parsing.
- `src/infrastructure/simplified_parser.ts` — `SimplifiedParser` implementing `CodeParser`. Accepts a `LanguagePatternSet`, scans content with regexes, builds `ParsingResult` with symbols and chunks.
- `src/infrastructure/language_patterns/python_patterns.ts` — Python-specific patterns for functions, classes, methods, imports, and decorators.
- `src/infrastructure/python_parser.ts` — `PythonParser` implementing `CodeParser` using `tree-sitter` + `tree-sitter-python`.
- `src/infrastructure/simplified_parser.test.ts` — unit tests for the generic simplified parser using Python patterns.
- `src/infrastructure/python_parser.test.ts` — unit tests for the Python AST parser.
- `src/infrastructure/language_patterns/python_patterns.test.ts` — unit tests for Python regex patterns.

### MODIFIED

- `src/container_factory.ts` — instantiate and register `PythonParser` and `SimplifiedParser` (with Python patterns) in the `ParserRegistry`.
- `src/infrastructure/parsing_pipeline.ts` — optionally improve language detection so Python files are detected before falling back.
- `package.json` / `package-lock.json` — add `tree-sitter` and `tree-sitter-python` dependencies.
- `specs/living/diamondblock-core.md` — update the parsing strategy section to mention simplified parser and Python support.

### REMOVED

- Nothing.

## Migration Notes

No data migration is required. Existing `CodebaseChunk` records keep their existing metadata. A reindex of a Python project will replace fallback chunks with higher-confidence parser chunks because the content hash of `.py` files has not changed, but the parsing pipeline output may differ — this is treated as a normal incremental update when the project is reindexed.

## Backward Compatibility

This change is backward compatible:

- Existing manifests continue to reference valid `chunkIds`.
- TypeScript/JavaScript parsing is unchanged.
- Unsupported files still use `SmartFallbackChunker`.
- The `CodeParser` interface is not broken; new parsers implement it.
