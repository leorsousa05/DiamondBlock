# Proposal: Add Generic Simplified Parser and Python AST Adapter

## Status
- **State:** draft
- **Created:** 2026-07-09
- **Author:** architect

## Problem Statement

The DiamondBlock codebase indexer currently supports only TypeScript/JavaScript through a full AST parser (`TypeScriptParser`). All other languages — including Python, Go, Rust, shell scripts, YAML, JSON, Markdown, and configuration files — fall back to `SmartFallbackChunker`, which splits files by blank lines, comments, and region markers without extracting symbols, imports, or semantic structure.

This creates two problems:

1. **Low-quality embeddings for non-TS/JS code.** Chunks produced by the fallback chunker carry `confidence: 0.35`, `supportsSymbols: false`, and `supportsGraph: false`. Search results for Python code are less precise because titles and content lack symbol hints.
2. **No incremental path to multi-language support.** Adding a new language today requires writing a full `CodeParser` from scratch. There is no middle ground between "full AST parser" and "dumb line-based chunker."

Milestone 2 of the long-term plan addresses this gap by introducing a generic simplified parser and a Python adapter.

## Goals

1. **Create a generic simplified parser (`SimplifiedParser`)** that implements `CodeParser` using declarative regex/heuristic patterns. It must be reusable across languages by swapping a `LanguagePatternSet`.
2. **Deliver a Python adapter** that parses `.py` files into `ParsingResult` with functions, classes, methods, imports, and confidence metadata.
3. **Integrate both parsers into the existing pipeline** via `ParserRegistry` so `.py` files are indexed with higher confidence than fallback chunking.
4. **Preserve incremental indexing and fallback behavior.** If the Python parser is unavailable or fails, the system must still produce fallback chunks.

## Non-Goals

- Extracting symbol relations (calls, extends, implements) — deferred to Milestone 3.
- Full type inference for Python.
- Supporting Python 2 syntax.
- Rewriting the TypeScript parser or changing its behavior.
- Adding UI changes for the new parsers.

## Constraints

- **Local-first:** No external AI service or cloud API may be required.
- **Dependency weight:** Prefer lighter npm packages; justify any heavy parser dependency.
- **Backward compatibility:** Existing manifests and chunks must remain valid. Legacy `memoryIds` migration already handled by spec 008 must not be reintroduced.
- **Incremental indexing:** A reindex must reuse unchanged files and only re-parse modified files.
- **Test coverage:** New parsers must have unit tests covering common constructs and edge cases.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `tree-sitter` + `tree-sitter-python` increase install size and build time | Medium | Use optional peer-like installation; document that Python simplified parser works as fallback without tree-sitter |
| Python AST parser fails on malformed or Python 2 files | Low | Catch parse errors and fall back to `SimplifiedParser` |
| Simplified parser regexes are brittle across Python versions | Low | Comprehensive test suite with real-world samples; keep patterns conservative |
| Registry order causes simplified parser to shadow Python AST parser | Low | Register Python AST parser before simplified Python parser in `container_factory.ts` |

## Success Criteria

- [ ] `SimplifiedParser` implements `CodeParser` and is covered by unit tests.
- [ ] A `LanguagePatternSet` for Python is defined and tested independently.
- [ ] `PythonParser` produces `ParsingResult` with `parsingMode: 'ast'`, `confidence >= 0.85`, and symbols for functions/classes/methods.
- [ ] `.py` files are indexed through the new parser(s) when running `dblock index run`.
- [ ] If the Python AST parser is disabled or fails, `.py` files still receive fallback or simplified-parser chunks.
- [ ] Existing TypeScript/JavaScript indexing behavior is unchanged.
