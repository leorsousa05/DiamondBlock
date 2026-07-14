# Design: Generic Simplified Parser and Python AST Adapter

## Overview

This change adds a middle layer to the parsing cascade: a **generic simplified parser** that uses declarative regex/heuristic patterns to extract symbols and produce structured chunks for languages that do not yet have a full AST adapter. It also introduces a **Python AST adapter** based on `tree-sitter` + `tree-sitter-python` for high-quality Python indexing.

The architecture follows the existing **Ports and Adapters** pattern:

- `CodeParser` remains the central port.
- `SimplifiedParser` and `PythonParser` are new adapters.
- `LanguagePatternSet` is a new configuration contract that makes the simplified parser reusable across languages.
- `ParserRegistry` remains the wiring point; `container_factory.ts` registers adapters in priority order.

## Proposed Directory & File Structure

```
src/
├── application/
│   └── ports/
│       ├── code_parser.ts              (Existing — unchanged)
│       ├── parser_registry.ts          (Existing — unchanged)
│       └── language_pattern.ts         (NEW — pattern contract)
├── infrastructure/
│   ├── parsing_pipeline.ts             (Existing — minor language detection extension)
│   ├── parser_registry_impl.ts         (Existing — unchanged)
│   ├── simplified_parser.ts            (NEW — generic heuristic parser)
│   ├── simplified_parser.test.ts       (NEW)
│   ├── python_parser.ts                (NEW — tree-sitter adapter)
│   ├── python_parser.test.ts           (NEW)
│   ├── language_patterns/
│   │   ├── python_patterns.ts          (NEW — Python regex patterns)
│   │   └── python_patterns.test.ts     (NEW)
│   ├── typescript_parser.ts            (Existing — unchanged)
│   ├── smart_fallback_chunker.ts       (Existing — unchanged)
│   └── semantic_chunk_builder_impl.ts  (Existing — unchanged)
├── container_factory.ts                (MODIFIED — register new parsers)
└── ...
specs/changes/011-simplified-parser-python/
├── .spec.yaml
├── proposal.md
├── design.md
├── tasks.md
└── specs/
    └── simplified-parser-python/
        └── spec.md
```

## Code Architecture & Design Patterns

### Architecture Model

**Ports and Adapters (Hexagonal).** The domain/application layer owns `CodeParser`, `ParserRegistry`, and the new `LanguagePatternSet` contracts. Infrastructure adapters (`TypeScriptParser`, `PythonParser`, `SimplifiedParser`) depend on these ports and on external libraries (`typescript`, `tree-sitter`). The wiring happens in `container_factory.ts`, which is the composition root.

### Design Patterns Used

- **Strategy:** `CodeParser` is a strategy interface. `ParsingPipeline` selects a strategy via `ParserRegistry` without knowing concrete implementations.
- **Template Method / Configurable Object:** `SimplifiedParser` implements the generic parsing algorithm; `LanguagePatternSet` supplies language-specific rules, making the parser reusable.
- **Registry:** `ParserRegistryImpl` collects parsers. Insertion order determines precedence.
- **Adapter:** `PythonParser` wraps `tree-sitter` behind the `CodeParser` port, isolating the library from the rest of the system.
- **Fallback Chain:** `ParsingPipeline` → AST parser → simplified parser → fallback chunker. Each layer degrades gracefully.

## Data Model

### New Port: `LanguagePatternSet`

```typescript
// src/application/ports/language_pattern.ts

export interface SymbolPattern {
  /** Regex with named capture groups. Required groups: name, signature? */
  regex: RegExp;
  kind: 'function' | 'class' | 'method' | 'interface' | 'enum' | 'type' | 'variable' | 'unknown';
  /** Is this symbol exported/public? */
  isPublic?: (match: RegExpExecArray, lines: string[]) => boolean;
}

export interface LanguagePatternSet {
  language: string;
  fileExtensions: string[];
  /** Patterns executed line-by-line to detect top-level or nested symbols. */
  symbolPatterns: SymbolPattern[];
  /** Regex to extract import/include statements. */
  importPattern: RegExp;
  /** Detect whether a line continues a multi-line symbol definition. */
  isContinuation?: (currentLine: string, nextLine: string) => boolean;
}
```

### `SimplifiedParser` Contract

```typescript
// src/infrastructure/simplified_parser.ts

import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult, CodeSymbol } from '../application/ports/code_parser.js';
import type { LanguagePatternSet } from '../application/ports/language_pattern.js';

export interface SimplifiedParserOptions {
  patterns: LanguagePatternSet;
  confidence?: number;
}

export class SimplifiedParser implements CodeParser {
  constructor(private readonly options: SimplifiedParserOptions);

  canParse(file: SourceFile): boolean;
  parse(file: SourceFile, content: string): Promise<ParsingResult>;
}
```

### `PythonParser` Contract

```typescript
// src/infrastructure/python_parser.ts

import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult } from '../application/ports/code_parser.js';

export interface PythonParserOptions {
  /** If true, parse errors fall back to SimplifiedParser instead of fallback chunker. */
  fallbackOnError?: boolean;
  simplifiedParser?: CodeParser;
}

export class PythonParser implements CodeParser {
  constructor(options?: PythonParserOptions);

  canParse(file: SourceFile): boolean;
  parse(file: SourceFile, content: string): Promise<ParsingResult>;
}
```

## API Contracts

### `ParsingResult` for Simplified Parser

For a Python file processed by `SimplifiedParser`:

```typescript
{
  language: 'python',
  parsingMode: 'simplified',
  confidence: 0.65,
  supportsGraph: false,
  supportsSymbols: true,
  symbols: [
    { id: 'sym_...', name: 'calculate_tax', kind: 'function', startLine: 10, endLine: 25, signature: 'def calculate_tax(income)' }
  ],
  relations: [],
  chunks: [
    {
      filePath: 'src/tax.py',
      startLine: 10,
      endLine: 25,
      language: 'python',
      content: '// file: src/tax.py lines 10-25 symbols: sym_...\ndef calculate_tax(income): ...',
      metadata: {
        parsingMode: 'simplified',
        confidence: 0.65,
        supportsGraph: false,
        supportsSymbols: true,
        language: 'python',
        imports: ['import json'],
        symbolIds: ['sym_...']
      }
    }
  ]
}
```

### `ParsingResult` for Python AST Parser

```typescript
{
  language: 'python',
  parsingMode: 'ast',
  confidence: 0.9,
  supportsGraph: true,
  supportsSymbols: true,
  symbols: [
    { id: 'sym_...', name: 'TaxCalculator', kind: 'class', startLine: 5, endLine: 40 },
    { id: 'sym_...', name: 'calculate', kind: 'method', startLine: 12, endLine: 30 }
  ],
  relations: [],
  chunks: [ /* one chunk per top-level symbol */ ]
}
```

## Flow Diagrams

### File Processing Flow

1. `ParsingPipeline.process(file, content)` is called.
2. `registry.findParser(file)` iterates registered parsers in insertion order.
3. **If `PythonParser.canParse(file)` is true:**
   - `PythonParser.parse(file, content)` runs tree-sitter.
   - On success, `SemanticChunkBuilder.build(file, result)` enriches chunks.
   - On parse error, if `fallbackOnError` is enabled, delegate to the injected `SimplifiedParser`.
4. **If no AST parser matches and a `SimplifiedParser` is registered for the language:**
   - `SimplifiedParser.parse(file, content)` scans with regex patterns.
   - `SemanticChunkBuilder.build(file, result)` enriches chunks.
5. **Otherwise:**
   - `SmartFallbackChunker.chunk(file, content)` produces fallback chunks.

### Registration Priority in `container_factory.ts`

```typescript
const parserRegistry = new ParserRegistryImpl();
parserRegistry.register('typescript', new TypeScriptParser());
parserRegistry.register('python', new PythonParser({
  fallbackOnError: true,
  simplifiedParser: new SimplifiedParser({ patterns: pythonPatterns, confidence: 0.65 }),
}));
parserRegistry.register('python-simplified', new SimplifiedParser({ patterns: pythonPatterns, confidence: 0.65 }));
```

This order ensures:
- TS/JS files hit `TypeScriptParser` first.
- `.py` files hit `PythonParser` (AST) first.
- If `PythonParser` is disabled or its `canParse` returns false, the simplified Python parser catches `.py`.

## Language Detection Extension

`ParsingPipeline` already detects `.py` as `'python'` in `detectLanguage`. No change is required, but we should ensure the detection table remains in sync with registered parsers. Consider moving `detectLanguage` to a shared `language_detector.ts` in a future spec.

## Error Handling

- `PythonParser.parse` catches tree-sitter errors and returns `Promise.reject(new Error(...))` if `fallbackOnError` is false.
- If `fallbackOnError` is true and a simplified parser is injected, the error is swallowed and the simplified result is returned.
- `SimplifiedParser` never throws on regex errors; it returns an empty symbol/chunk set with `parsingMode: 'simplified'`, `confidence: 0.65` so the fallback chunker in the pipeline can still produce chunks.

## Performance Considerations

- `tree-sitter` parsing is fast for typical source files (< 1 ms per KB). Large generated Python files (> 10k lines) may take longer; the pipeline processes files sequentially, so no backpressure is needed yet.
- Regex scanning in `SimplifiedParser` is single-pass per line per pattern. Keep the number of symbol patterns small (< 10) to avoid O(n·m) explosion.
- Symbol ID generation must be deterministic (same file + name + startLine → same id) to keep incremental indexing stable.

## Security Considerations

- `SimplifiedParser` only runs regexes on file content; no code execution.
- `PythonParser` uses `tree-sitter`, a parser combinator library; it does not execute Python code.
- No untrusted input is executed. Files come from the local codebase scanner.

## Testing Strategy

- **Unit tests for `SimplifiedParser`:** empty files, single function, nested classes, imports, decorators, mixed content.
- **Unit tests for `python_patterns`:** verify each regex matches expected constructs and does not match false positives.
- **Unit tests for `PythonParser`:** parse a Python module with classes, methods, functions, imports; assert symbol kinds and line ranges.
- **Integration test via `ParsingPipeline`:** register parsers and verify `.py` files produce `parsingMode: 'ast'` or `'simplified'` results.
- **Regression test:** verify TS/JS files still produce `parsingMode: 'ast'` from `TypeScriptParser`.

## Deferred Items

- Symbol relation extraction (imports/exports, calls, extends) — Milestone 3.
- Multi-language pattern sets for Go, Rust, shell, YAML, Markdown — future specs.
- Moving `detectLanguage` to a shared module — future refactor spec.
- Optional Python stdlib `ast` bridge via child process — kept as an ADR candidate if tree-sitter proves too heavy.
