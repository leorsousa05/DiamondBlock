# Tasks: Add Generic Simplified Parser and Python AST Adapter

## Setup
- [x] Create spec folder `specs/changes/011-simplified-parser-python/`
- [x] Initialize `.spec.yaml`, `proposal.md`, `design.md`, `tasks.md`, and `specs/simplified-parser-python/spec.md`

## Contracts
- [x] Define `LanguagePatternSet`, `SymbolPattern` in `src/application/ports/language_pattern.ts`
- [x] Verify `CodeParser` and `ParsingResult` contracts support the new parsers without modification

## Generic Simplified Parser
- [x] Implement `SimplifiedParser` in `src/infrastructure/simplified_parser.ts`
  - [x] `canParse(file)` checks file extension against `LanguagePatternSet.fileExtensions`
  - [x] `parse(file, content)` scans content line-by-line with symbol patterns
  - [x] Build `ParsingResult` with `parsingMode: 'simplified'`, `confidence: 0.65`, `supportsSymbols: true`, `supportsGraph: false`
  - [x] Extract imports using `importPattern`
  - [x] Generate deterministic symbol IDs
  - [x] Build one chunk per symbol
- [x] Write unit tests in `src/infrastructure/simplified_parser.test.ts`
  - [x] Empty file returns empty result
  - [x] Single function
  - [x] Class with methods
  - [x] Imports are captured and propagated to chunks

## Python Patterns
- [x] Create `src/infrastructure/language_patterns/python_patterns.ts`
  - [x] Function pattern (`def name(...)`)
  - [x] Class pattern (`class Name(...)`)
  - [x] Method pattern (function inside class indentation)
  - [x] Import patterns (`import ...`, `from ... import ...`)
  - [x] Decorator handling
- [x] Write unit tests in `src/infrastructure/language_patterns/python_patterns.test.ts`

## Python AST Parser
- [x] Add `tree-sitter` and `tree-sitter-python` to `package.json` dependencies
- [x] Run `npm install` to update `package-lock.json`
- [x] Implement `PythonParser` in `src/infrastructure/python_parser.ts`
  - [x] `canParse(file)` returns true for `.py`
  - [x] `parse(file, content)` uses tree-sitter to walk the AST
  - [x] Extract top-level functions, classes, methods, imports
  - [x] Compute line ranges and signatures
  - [x] Build `ParsingResult` with `parsingMode: 'ast'`, `confidence: 0.9`, `supportsSymbols: true`, `supportsGraph: true`
  - [x] On parse error, delegate to injected `SimplifiedParser` if `fallbackOnError` is true
- [x] Write unit tests in `src/infrastructure/python_parser.test.ts`
  - [x] Parse module with classes and functions
  - [x] Parse module with decorators and imports
  - [x] Parse error falls back to simplified parser when configured

## Integration
- [x] Update `src/container_factory.ts` to register `PythonParser` and `SimplifiedParser` in the correct order
- [x] Ensure `ParsingPipeline` language detection recognizes `.py` as `'python'`
- [x] Update `specs/living/diamondblock-core.md` to mention simplified parser and Python support

## Testing
- [x] Run `npm run test` and ensure all new and existing tests pass
- [x] Run `npm run typecheck` and fix type errors
- [x] Add integration test in `src/infrastructure/parsing_pipeline.test.ts` for Python file flow
- [x] Verify TS/JS regression: existing `typescript_parser.test.ts` still passes

## Verification
- [x] Confirm `.py` chunks have `parsingMode` `'ast'` or `'simplified'` (not `'fallback'`) via unit tests
- [x] Confirm TypeScript/JavaScript files still index normally

## Documentation
- [x] Update `specs/living/diamondblock-core.md` parsing strategy section

## Completion
- [x] Update `.spec.yaml` status to completed
- [ ] Route to Reviewer for code review
- [ ] Archive change folder via Shipper
