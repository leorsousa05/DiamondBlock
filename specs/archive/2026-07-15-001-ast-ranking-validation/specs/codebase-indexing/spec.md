# Spec Delta: Codebase Indexing Quality

## ADDED Requirements

### Requirement: Local Evaluation Harness

DiamondBlock SHALL provide a local evaluation harness for codebase indexing quality.

#### Scenario: Run deterministic evaluation

- **GIVEN** a fixture project with known files, symbols, and expected query matches
- **WHEN** the evaluation use case indexes the fixture and runs predefined queries
- **THEN** it SHALL return deterministic metrics for retrieval quality and token savings
- **AND** it SHALL not require network access or external API credentials

#### Scenario: Report token savings

- **GIVEN** a query with expected relevant files
- **WHEN** the evaluation compares retrieved chunks to a broad source baseline
- **THEN** it SHALL report approximate tokens retrieved, approximate baseline tokens, and percentage reduction
- **AND** it SHALL label the result as an estimate

### Requirement: Retrieval Quality Metrics

DiamondBlock SHALL calculate search-quality metrics for fixture queries.

#### Scenario: Top-k hit rate

- **GIVEN** an evaluation query with expected file paths or symbol names
- **WHEN** semantic search returns ranked chunks
- **THEN** the evaluator SHALL report whether expected targets appear in top 1, top 3, and top 5

#### Scenario: Parser-mode distribution

- **GIVEN** indexed fixture chunks
- **WHEN** evaluation summarizes the index
- **THEN** it SHALL report counts and percentages for `ast`, `simplified`, and `fallback` parsing modes

### Requirement: Existing Language AST Improvements

DiamondBlock SHALL improve AST metadata for TypeScript/JavaScript and Python before adding new AST language adapters.

#### Scenario: TypeScript symbol coverage

- **GIVEN** TypeScript or TSX files with default exports, classes, methods, interfaces, type aliases, enums, hooks, and components
- **WHEN** the TypeScript parser processes the file
- **THEN** it SHALL emit stable symbol metadata for supported declarations
- **AND** it SHALL avoid emitting noisy local variables inside functions as top-level chunks

#### Scenario: Python symbol coverage

- **GIVEN** Python files with classes, methods, decorators, async functions, imports, and inheritance
- **WHEN** the Python parser processes the file
- **THEN** it SHALL emit stable symbol metadata and preserve relevant imports in chunk metadata

### Requirement: Relation Candidates

DiamondBlock SHALL support low-risk relation candidates for existing AST parsers.

#### Scenario: Import relation candidates

- **GIVEN** a parsed source file with imports
- **WHEN** parser output includes relations
- **THEN** import relation candidates SHALL use `type: 'imports'`
- **AND** they SHALL not claim exact symbol resolution unless the target symbol ID is known

#### Scenario: Inheritance relation candidates

- **GIVEN** a parsed class that extends or implements another type
- **WHEN** parser output includes relations
- **THEN** inheritance relation candidates SHALL use `extends` or `implements` where supported by the language parser

## MODIFIED Requirements

### Requirement: Codebase Indexer Feedback

The codebase indexer result SHOULD remain backward compatible, while evaluation-specific metrics SHOULD live in a separate use case or report type.

#### Scenario: Existing index command behavior

- **GIVEN** existing CLI or MCP users calling codebase indexing
- **WHEN** this change is implemented
- **THEN** existing command output and API contracts SHALL continue to work
- **AND** new evaluation output SHALL be opt-in

## REMOVED Requirements

None.
