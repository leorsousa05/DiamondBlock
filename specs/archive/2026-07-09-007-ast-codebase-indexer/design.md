---
created_at: 2026-07-08
updated_at: 2026-07-08
---

# Design: Generic Semantic Parsing Engine + TS/JS AST Chunking

## 7 Analysis Questions

### 1. Domain and bounded context placement?

This change lives in the **Memory & Knowledge** bounded context, inside the existing Codebase Indexer subsystem. It introduces a new parser abstraction and replaces the line-based chunking strategy with a semantic one. The domain value object `CodeChunk` is extended with metadata, but the memory storage contract remains unchanged.

### 2. Core responsibilities of new/changed components?

- **`CodeParser` port** — abstracts any language parser. Receives a `SourceFile` and content, returns a `ParsingResult`.
- **`ParserRegistry`** — maps file extensions/languages to concrete `CodeParser` instances. Returns `null` when no parser is registered.
- **`SemanticChunkBuilder`** — converts `ParsingResult` into `CodeChunkInput[]`. Ensures each chunk is semantically meaningful and prepends contextual headers (file path, imports, symbol name).
- **`ParsingPipeline`** — orchestrates the cascade:
  1. Try AST parser.
  2. Try simplified parser (Milestone 2).
  3. Use smart fallback chunker.
- **`TypeScriptParser`** — first concrete parser using the TypeScript compiler API (`typescript`).
- **`SmartFallbackChunker`** — delimiter-aware fallback for unsupported files.
- **`CodebaseIndexer`** — uses `ParsingPipeline` instead of `LineCodeChunker`.

### 3. Contracts to define or change?

```ts
// src/application/ports/code_parser.ts
export type ParsingMode = 'ast' | 'simplified' | 'fallback';

export interface CodeSymbol {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'method' | 'component' | 'hook' | 'enum' | 'type' | 'variable' | 'unknown';
  startLine: number;
  endLine: number;
  signature?: string;
  documentation?: string;
}

export interface SymbolRelation {
  fromSymbolId: string;
  toSymbolId: string;
  type: 'calls' | 'imports' | 'extends' | 'implements' | 'references';
}

export interface ChunkMetadata {
  parsingMode: ParsingMode;
  confidence: number;
  supportsGraph: boolean;
  supportsSymbols: boolean;
  language: string;
  imports: string[];
  symbolIds: string[];
  parentSymbolId?: string;
}

export interface ParsingResult {
  language: string;
  parsingMode: ParsingMode;
  confidence: number;
  supportsGraph: boolean;
  supportsSymbols: boolean;
  symbols: CodeSymbol[];
  relations: SymbolRelation[];
  chunks: CodeChunkInput[];
}

export interface CodeParser {
  canParse(file: SourceFile): boolean;
  parse(file: SourceFile, content: string): Promise<ParsingResult>;
}
```

```ts
// src/application/ports/parser_registry.ts
export interface ParserRegistry {
  register(language: string, parser: CodeParser): void;
  findParser(file: SourceFile): CodeParser | null;
}
```

```ts
// src/application/ports/semantic_chunk_builder.ts
export interface SemanticChunkBuilder {
  build(file: SourceFile, result: ParsingResult): CodeChunkInput[];
}
```

```ts
// src/infrastructure/parsing_pipeline.ts
export interface ParsingPipelineOptions {
  registry: ParserRegistry;
  fallbackChunker: SmartFallbackChunker;
  semanticChunkBuilder: SemanticChunkBuilder;
}

export class ParsingPipeline {
  async process(file: SourceFile, content: string): Promise<ParsingResult>;
}
```

### 4. Which parts need tests per TDD skip criteria?

All new components involve branching, external dependencies (parsers), or public API surface. No component qualifies for test skip.

Required tests:

- `TypeScriptParser` — functions, classes, components, interfaces, imports, edge cases (syntax errors).
- `SmartFallbackChunker` — delimiter detection, fallback to size-based splitting, overlap.
- `ParsingPipeline` — cascade order, metadata propagation, fallback behavior.
- `ParserRegistry` — registration and lookup by extension.
- `SemanticChunkBuilder` — chunk boundaries, header injection, metadata attachment.
- `CodebaseIndexer` — integration with new pipeline, incremental behavior preserved.

### 5. Architecture that minimizes ambiguity?

- **Strategy Pattern** — `CodeParser` is a strategy; each language is a new strategy.
- **Registry Pattern** — `ParserRegistry` decouples language detection from parser implementation.
- **Pipeline Pattern** — `ParsingPipeline` centralizes the cascade decision.
- **Clean Architecture / Ports & Adapters** — domain (`CodeChunk`) and application (ports) remain independent of parser libraries.
- **Backward Compatibility** — `CodeChunkInput` gains optional metadata; old chunks continue to work.

### 6. Project structure changes needed?

```
src/
├── application/
│   └── ports/
│       ├── code_parser.ts              NEW
│       ├── parser_registry.ts          NEW
│       └── semantic_chunk_builder.ts   NEW
├── infrastructure/
│   ├── parsing_pipeline.ts             NEW
│   ├── parsing_pipeline.test.ts        NEW
│   ├── typescript_parser.ts            NEW
│   ├── typescript_parser.test.ts       NEW
│   ├── smart_fallback_chunker.ts       NEW
│   ├── smart_fallback_chunker.test.ts  NEW
│   ├── parser_registry_impl.ts         NEW
│   ├── parser_registry_impl.test.ts    NEW
│   ├── semantic_chunk_builder_impl.ts  NEW
│   ├── semantic_chunk_builder_impl.test.ts NEW
│   ├── codebase_indexer.ts             MODIFY
│   ├── codebase_indexer.test.ts        MODIFY
│   └── line_code_chunker.ts            KEEP (legacy)
├── domain/
│   ├── code_chunk.ts                   MODIFY
│   └── code_chunk.test.ts              MODIFY
└── container_factory.ts                MODIFY
```

### 7. Key trade-offs?

- **TypeScript compiler API vs Babel vs Tree-sitter:** TypeScript compiler API is the safest first choice for TS/JS because it ships with `typescript`, requires no native dependencies, and handles JSX/TSX. Tree-sitter is better for multi-language support later but adds native build complexity.
- **Symbol relations in this milestone:** We define the `SymbolRelation` type but leave population to Milestone 3. This keeps the spec focused while avoiding future refactoring.
- **Smart fallback vs line chunker:** Smart fallback is more complex but produces better chunks for config/docs. Line chunker remains available as a simpler option.
- **Embeddings input:** We keep embedding the chunk content (with header), but metadata improves retrieval filters. Future milestones may embed enriched summaries.

---

## 🧱 Padrões Aplicados

- **Strategy Pattern:** cada linguagem implementa `CodeParser`. Adicionar Python no futuro significa apenas criar um novo adapter e registrá-lo.
- **Registry Pattern:** `ParserRegistry` isola a lógica de "qual parser usar" dos adapters concretos.
- **Pipeline Pattern:** `ParsingPipeline` encapsula a política de cascata e metadados de confiança.
- **Clean Architecture / Ports & Adapters:** domínio e aplicação dependem apenas das ports. As bibliotecas de parsing ficam nos adapters.
- **Backward Compatibility:** `CodeChunkInput` ganha `metadata?` opcional; chunks antigos continuam válidos.

---

## 🚀 Estratégia de Implementação

### Phase 1 — Ports and contracts

1. Criar `src/application/ports/code_parser.ts` com `ParsingResult`, `CodeSymbol`, `SymbolRelation`, `ChunkMetadata`, `CodeParser`.
2. Criar `src/application/ports/parser_registry.ts` com `ParserRegistry`.
3. Criar `src/application/ports/semantic_chunk_builder.ts` com `SemanticChunkBuilder`.
4. Extender `CodeChunkInput` em `src/application/ports/code_chunker.ts` com campo `metadata?: ChunkMetadata`.
5. Atualizar `src/domain/code_chunk.ts` para propagar metadata quando presente.

### Phase 2 — Fallback chunker

1. Criar `src/infrastructure/smart_fallback_chunker.ts`.
   - Detectar delimitadores: linhas em branco duplas, comentários de bloco, region markers, markdown headings, blocos YAML/JSON.
   - Se houver delimitadores, dividir por eles respeitando `maxChunkLines` (~300).
   - Se não houver, usar janelas de ~300 linhas com overlap de ~30.
   - Retornar `CodeChunkInput[]` com `parsingMode: 'fallback'`, `confidence: 0.35`.
2. Criar testes.

### Phase 3 — TypeScript parser adapter

1. Adicionar `typescript` como dev/dependency se ainda não estiver.
2. Criar `src/infrastructure/typescript_parser.ts`.
   - Usar `ts.createSourceFile` com `ScriptTarget.Latest` e `ScriptKind.TSX`.
   - Percorrer nós com `forEachChild`.
   - Extrair: FunctionDeclaration, ArrowFunction (em variáveis), ClassDeclaration, InterfaceDeclaration, TypeAliasDeclaration, EnumDeclaration, VariableStatement (para hooks/components), MethodDeclaration.
   - Capturar imports do topo do arquivo.
   - Criar `CodeChunkInput` por símbolo, incluindo o texto original do símbolo + imports no header.
3. Criar testes cobrindo componentes React, funções com overload, classes e namespaces.

### Phase 4 — Registry and pipeline

1. Criar `src/infrastructure/parser_registry_impl.ts`.
   - Mapa `language -> CodeParser`.
   - Lookup por extensão do arquivo (`ts`, `tsx`, `js`, `jsx`, `mts`, `cts`, `mjs`, `cjs`).
2. Criar `src/infrastructure/semantic_chunk_builder_impl.ts`.
   - Recebe `ParsingResult` e gera `CodeChunkInput[]` com headers padronizados.
3. Criar `src/infrastructure/parsing_pipeline.ts`.
   - Tenta parser do registry.
   - Se nenhum parser, usa `SmartFallbackChunker`.
   - Sempre passa pelo `SemanticChunkBuilder`.
4. Criar testes.

### Phase 5 — Integration

1. Modificar `src/infrastructure/codebase_indexer.ts`.
   - Receber `ParsingPipeline` no lugar de `CodeChunker`.
   - Chamar `pipeline.process(file, content)` no `indexFile`.
2. Atualizar `src/container_factory.ts` para instanciar e injetar o pipeline.
3. Atualizar `src/infrastructure/codebase_indexer.test.ts` se necessário.

### Phase 6 — Living docs and verification

1. Atualizar `specs/living/diamondblock-core.md` com o motor de parsing semântico.
2. Rodar `npm run typecheck`.
3. Rodar `npm test`.
4. Atualizar `specs/changes/007-ast-codebase-indexer/.spec.yaml` status para `completed`.

---

## 🔌 Contracts & Stubs

### Domain value object extension

```ts
// src/application/ports/code_chunker.ts
export interface CodeChunkInput {
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  metadata?: ChunkMetadata;
}
```

### Parser port

```ts
// src/application/ports/code_parser.ts
export interface CodeParser {
  canParse(file: SourceFile): boolean;
  parse(file: SourceFile, content: string): Promise<ParsingResult>;
}
```

### Registry port

```ts
// src/application/ports/parser_registry.ts
export interface ParserRegistry {
  register(language: string, parser: CodeParser): void;
  findParser(file: SourceFile): CodeParser | null;
}
```

### Chunk builder port

```ts
// src/application/ports/semantic_chunk_builder.ts
export interface SemanticChunkBuilder {
  build(file: SourceFile, result: ParsingResult): CodeChunkInput[];
}
```

### Pipeline

```ts
// src/infrastructure/parsing_pipeline.ts
export class ParsingPipeline {
  constructor(options: ParsingPipelineOptions) {}
  async process(file: SourceFile, content: string): Promise<ParsingResult>;
}
```

---

## Test Plan

- **TypeScriptParser**
  - Extrai função simples como um chunk.
  - Extrai componente React como um chunk.
  - Extrai classe com métodos; cada método é chunk separado? (definir política: classe como chunk, métodos também como chunks opcionais na v1)
  - Preserva imports no header.
  - Retorna `parsingMode: 'ast'`, `confidence: 0.95`.

- **SmartFallbackChunker**
  - Divide arquivo Markdown por headings.
  - Divide YAML por blocos de primeiro nível.
  - Divide arquivo sem delimitadores em janelas de tamanho fixo.
  - Retorna `parsingMode: 'fallback'`, `confidence: 0.35`.

- **ParserRegistryImpl**
  - Registra parser TS/JS.
  - Resolve parser por `.tsx`.
  - Retorna `null` para `.py` quando não registrado.

- **SemanticChunkBuilderImpl**
  - Prepend header com file path e imports.
  - Anexa metadata aos chunks.

- **ParsingPipeline**
  - Usa AST quando parser disponível.
  - Cai para fallback quando parser indisponível.
  - Propaga metadata corretamente.

- **CodebaseIndexer integration**
  - Reindexação incremental preserva comportamento.
  - Chunks antigos são removidos quando arquivo muda.

## Risk Assessment

- **Impact:** High. Touches core indexer pipeline.
- **Compatibility:** Backward-compatible if metadata is optional.
- **Performance:** TypeScript compiler API may be slower than line splitting on huge files. Mitigation: incremental hashing and file size limits already exist.
- **Complexity:** Introduces several new components. Mitigation: strong test coverage and small phases.
- **Deferred:** Symbol relations, knowledge graph, Python/other languages, MCP symbol tools.

## Subagent Parallelization

This milestone has clear independent components but they depend on shared contracts. Recommended split after Phase 1:

```yaml
subagents:
  approved: true
  components:
    - name: "TypeScript parser adapter"
      scope: "Implement TypeScriptParser that produces ParsingResult with functions, classes, components, interfaces, and imports."
      files: "src/infrastructure/typescript_parser.ts, src/infrastructure/typescript_parser.test.ts"
      constraints: "Do NOT touch registry, pipeline, or indexer. Use contracts from Phase 1."
    - name: "Smart fallback chunker"
      scope: "Implement SmartFallbackChunker with delimiter detection and size-based fallback."
      files: "src/infrastructure/smart_fallback_chunker.ts, src/infrastructure/smart_fallback_chunker.test.ts"
      constraints: "Do NOT touch AST parser or indexer. Return CodeChunkInput with fallback metadata."
    - name: "Registry, chunk builder, and pipeline"
      scope: "Implement ParserRegistryImpl, SemanticChunkBuilderImpl, and ParsingPipeline that wires them together."
      files: "src/infrastructure/parser_registry_impl.ts, src/infrastructure/parser_registry_impl.test.ts, src/infrastructure/semantic_chunk_builder_impl.ts, src/infrastructure/semantic_chunk_builder_impl.test.ts, src/infrastructure/parsing_pipeline.ts, src/infrastructure/parsing_pipeline.test.ts"
      constraints: "Do NOT implement concrete parsers. Use CodeParser port."
```

Integration into `CodebaseIndexer` and `container_factory.ts` should be done sequentially after the components are ready.
