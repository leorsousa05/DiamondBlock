# Design: Codebase Indexer

## 7 Analysis Questions

### 1. Domain and bounded context placement?

This change lives in the **Memory & Knowledge** bounded context of DiamondBlock. It introduces a new value object for code chunks and three new infrastructure ports (scanner, chunker, index repository) plus a new application use case. Code chunks are persisted as ordinary `Memory` entities, so no new storage engine is required. The feature reuses the existing project-resolution (`ProjectResolver`) and scope (`Scope`) abstractions.

### 2. Core responsibilities of new/changed components?

- **`CodeChunk` value object** (`src/domain/code_chunk.ts`): represents one chunk of a source file. Holds the file path, line range, language tag, chunk text, and a deterministic id.
- **`CodebaseScanner` port** (`src/application/ports/codebase_scanner.ts`): abstracts file discovery. Returns a list of source files with their absolute paths and relative paths.
- **`FileCodebaseScanner` adapter** (`src/infrastructure/file_codebase_scanner.ts`): walks the project directory, applies extension/size filters, and honors `.gitignore`.
- **`CodeChunker` port** (`src/application/ports/code_chunker.ts`): abstracts text splitting.
- **`LineCodeChunker` adapter** (`src/infrastructure/line_code_chunker.ts`): splits file contents into fixed-size line windows with overlap.
- **`CodebaseIndexRepository` port** (`src/application/ports/codebase_index_repository.ts`): persists and retrieves the index manifest.
- **`FileCodebaseIndexRepository` adapter** (`src/infrastructure/file_codebase_index_repository.ts`): stores the manifest as JSON at `vault/CodebaseIndex/<projectId>.json`.
- **`CodebaseIndexer`** (`src/infrastructure/codebase_indexer.ts`): high-level orchestrator that ties scanner + chunker + manifest + memory repository + vector index + embedding provider.
- **`IndexCodebaseUseCase`** (`src/application/use_cases/index_codebase.ts`): application-layer entry point. Resolves project, calls `CodebaseIndexer`, and reports statistics.
- **`ContextBuilder`** (`src/domain/services/context_builder.ts`): adds `findCodeMemories` dependency and a new `codeContext` output field.
- **`GetContextUseCase`** (`src/application/use_cases/get_context.ts`): wires `findCodeMemories` and returns `code_context`.
- **CLI** (`src/presentation/cli/index.ts`): adds `index [path]` command with `--project`, `--force`, `--dry-run`, and `--status` options.
- **MCP server** (`src/presentation/mcp/server.ts`): adds `index_codebase` tool and extends `get_context` response with `code_context`.

### 3. Contracts to define or change?

```ts
// src/domain/code_chunk.ts
export interface CodeChunk {
  id: string;              // deterministic: file hash + start line
  filePath: string;        // relative to project root
  startLine: number;       // 1-based inclusive
  endLine: number;         // 1-based inclusive
  language: string;        // extension or 'unknown'
  content: string;         // raw chunk text
}

export interface CodeChunkInput {
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
}

export function createCodeChunk(input: CodeChunkInput): CodeChunk;
export function codeChunkToMemory(chunk: CodeChunk, projectId: string): MemoryInput;
```

```ts
// src/application/ports/codebase_scanner.ts
export interface SourceFile {
  absolutePath: string;
  relativePath: string;
}

export interface CodebaseScannerOptions {
  rootPath: string;
  includeExtensions?: string[];  // default: common code/text extensions
  maxFileSizeBytes?: number;     // default: 1 MB
  respectGitignore?: boolean;    // default: true
}

export interface CodebaseScanner {
  scan(options: CodebaseScannerOptions): Promise<SourceFile[]>;
}
```

```ts
// src/application/ports/code_chunker.ts
export interface CodeChunkerOptions {
  chunkSizeLines?: number;   // default: 50
  overlapLines?: number;     // default: 10
}

export interface CodeChunker {
  chunk(file: SourceFile, content: string, options?: CodeChunkerOptions): Promise<CodeChunkInput[]>;
}
```

```ts
// src/application/ports/codebase_index_repository.ts
export interface FileIndexEntry {
  relativePath: string;
  contentHash: string;       // sha256 of file content
  indexedAt: string;         // ISO timestamp
  memoryIds: string[];       // ids of chunks produced from this file
}

export interface CodebaseIndexManifest {
  projectId: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  files: Record<string, FileIndexEntry>; // key = relativePath
}

export interface CodebaseIndexRepository {
  load(projectId: string): Promise<CodebaseIndexManifest | null>;
  save(manifest: CodebaseIndexManifest): Promise<void>;
  delete(projectId: string): Promise<void>;
}
```

```ts
// src/application/use_cases/index_codebase.ts
export interface IndexCodebaseInput {
  projectPath?: string;      // default: cwd
  projectId?: string;        // explicit override
  force?: boolean;           // reindex all files regardless of hash
  dryRun?: boolean;          // only report what would change
}

export interface IndexCodebaseOutput {
  projectId: string;
  scanned: number;
  indexed: number;           // files with new or updated chunks
  removed: number;           // files deleted from disk since last run
  chunksCreated: number;
  chunksRemoved: number;
}

export class IndexCodebaseUseCase {
  constructor(
    private readonly projectResolver: ProjectResolver,
    private readonly codebaseScanner: CodebaseScanner,
    private readonly codeChunker: CodeChunker,
    private readonly codebaseIndexRepository: CodebaseIndexRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  async execute(input: IndexCodebaseInput): Promise<IndexCodebaseOutput>;
}
```

```ts
// src/infrastructure/codebase_indexer.ts
export interface CodebaseIndexerOptions {
  scanner: CodebaseScanner;
  chunker: CodeChunker;
  indexRepository: CodebaseIndexRepository;
  memoryRepository: MemoryRepository;
  vectorIndex: VectorIndex;
  embeddingProvider: EmbeddingProvider;
}

export interface CodebaseIndexerResult {
  added: SourceFile[];
  updated: SourceFile[];
  removed: string[];         // relativePaths
  unchanged: SourceFile[];
}

export class CodebaseIndexer {
  constructor(private readonly options: CodebaseIndexerOptions) {}

  async index(
    projectId: string,
    rootPath: string,
    options?: { force?: boolean; dryRun?: boolean }
  ): Promise<CodebaseIndexerResult>;
}
```

```ts
// src/domain/services/context_builder.ts (modified)
export interface ContextBuilderDependencies {
  findUserMemory(): Promise<Memory | null>;
  findProjectMemory(projectId: string): Promise<Memory | null>;
  findGlobalMemories(limit: number): Promise<Memory[]>;
  findRecentSessions(projectId: string, limit: number): Promise<Session[]>;
  findRelevantMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
  findCodeMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
}

export interface ContextOutput {
  userMemory: string;
  projectMemory: string;
  globalMemory: string;
  codeContext: string;
  recentSessions: string[];
  relevantMemories: string[];
}
```

```ts
// src/application/use_cases/get_context.ts (modified)
export interface GetContextOutput {
  user_memory: string;
  project_memory: string;
  global_memory: string;
  code_context: string;
  recent_sessions: string[];
  relevant_memories: string[];
}
```

### 4. Which parts need tests per TDD skip criteria?

All new components involve branching, external dependencies, or public API surface. **No component qualifies for test skip.**

Required tests:

- `CodeChunk` — deterministic id generation, conversion to `MemoryInput`.
- `FileCodebaseScanner` — respects `.gitignore`, filters by extension and size, returns relative paths.
- `LineCodeChunker` — produces correct line ranges, overlap, handles files shorter than chunk size.
- `FileCodebaseIndexRepository` — load/save/delete round-trip, missing manifest returns null.
- `CodebaseIndexer` — incremental behavior (add/update/remove/unchanged), dry-run mode, force mode, chunk removal on file delete.
- `IndexCodebaseUseCase` — project resolution, error handling, output statistics.
- `ContextBuilder` — includes code context formatted with file paths and line ranges.
- `GetContextUseCase` — wires `findCodeMemories` and returns `code_context`.
- MCP server — `index_codebase` schema, `get_context` includes `code_context`.
- CLI — `index` command parsing and option propagation.

### 5. Architecture that minimizes ambiguity?

- **Clean Architecture / Hexagonal (Ports & Adapters):** File discovery, chunking, and manifest storage are hidden behind ports. The use case and domain never touch `fs` directly.
- **Strategy Pattern:** `CodebaseScanner` and `CodeChunker` are swappable strategies. The first implementation is line-based, but future language-aware chunkers can plug in.
- **Value Object:** `CodeChunk` is immutable and identified by deterministic content, making tests and incremental updates predictable.
- **Repository Pattern:** `CodebaseIndexRepository` abstracts manifest persistence. `MemoryRepository` + `VectorIndex` continue to own chunk storage.
- **Single Responsibility:** `CodebaseIndexer` orchestrates; `FileCodebaseScanner` discovers; `LineCodeChunker` splits; `FileCodebaseIndexRepository` persists manifests.
- **Backward Compatibility:** `get_context` adds a new field; callers that ignore it are unaffected. `search_memory` already supports filtering by scope, so code chunks are searchable immediately.

### 6. Project structure changes needed?

```
src/
├── domain/
│   ├── code_chunk.ts                          (NEW)
│   ├── code_chunk.test.ts                     (NEW)
│   └── services/
│       └── context_builder.ts                 (MODIFY)
│       └── context_builder.test.ts            (MODIFY)
├── application/
│   ├── ports/
│   │   ├── codebase_scanner.ts                (NEW)
│   │   ├── code_chunker.ts                    (NEW)
│   │   └── codebase_index_repository.ts       (NEW)
│   └── use_cases/
│       ├── index_codebase.ts                  (NEW)
│       ├── index_codebase.test.ts             (NEW)
│       └── get_context.ts                     (MODIFY)
│       └── get_context.test.ts                (MODIFY)
├── infrastructure/
│   ├── file_codebase_scanner.ts               (NEW)
│   ├── file_codebase_scanner.test.ts          (NEW)
│   ├── line_code_chunker.ts                   (NEW)
│   ├── line_code_chunker.test.ts              (NEW)
│   ├── file_codebase_index_repository.ts      (NEW)
│   ├── file_codebase_index_repository.test.ts (NEW)
│   └── codebase_indexer.ts                    (NEW)
│   └── codebase_indexer.test.ts               (NEW)
├── presentation/
│   ├── cli/
│   │   └── index.ts                           (MODIFY)
│   └── mcp/
│       └── server.ts                          (MODIFY)
│       └── server.test.ts                     (MODIFY)
├── container.ts                               (NO CHANGE)
└── container_factory.ts                       (MODIFY)

specs/
├── changes/
│   └── 006-codebase-indexer/                  (NEW)
│       ├── .spec.yaml
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/
│           └── codebase-indexer/
│               └── spec.md
└── living/
    └── diamondblock-core.md                   (MODIFY)
```

### 7. Key trade-offs?

- **Line-based vs AST-based chunking:** Line-based is simple, fast, and language-agnostic but may split functions. AST-based is better semantically but adds parser complexity. We start with line-based and leave the port open for smarter chunkers.
- **Hash-based incremental indexing:** SHA-256 of file content is reliable but means any edit triggers rechunking of the whole file. This is acceptable for typical source files and simpler than per-line diff tracking.
- **Code chunks as `knowledge` memories:** Reuses existing storage/search but mixes code with human-written knowledge. Tags and source distinguish them. A future `MemoryType: 'code'` would be cleaner but touches more contracts.
- **Dedicated `code_context` section:** Adds structure to `get_context` but requires updating both `ContextBuilder` and MCP/CLI consumers. The alternative is relying solely on `relevant_memories`, which is less explicit for agents.
- **`.gitignore` parsing:** A lightweight parser covers 90% of cases without adding a dependency. Complex negation rules are deferred.

---

## 🧱 Padrões Aplicados

- **Clean Architecture / Hexagonal (Ports & Adapters):** O domínio (`CodeChunk`) e a aplicação (`IndexCodebaseUseCase`) ficam no centro. Os adaptadores concretos (`FileCodebaseScanner`, `LineCodeChunker`, `FileCodebaseIndexRepository`) implementam as portas. A camada de apresentação depende apenas dos casos de uso e do container.
- **Strategy Pattern:** `CodebaseScanner` e `CodeChunker` permitem trocar a estratégia de descoberta e divisão sem alterar o orquestrador.
- **Value Object:** `CodeChunk` é imutável e tem id determinístico, facilitando testes e updates incrementais.
- **Repository Pattern:** `CodebaseIndexRepository` abstrai a persistência do manifesto; `MemoryRepository` + `VectorIndex` continuam responsáveis pelos chunks persistidos.
- **Single Responsibility:** Cada componente tem uma responsabilidade clara — descobrir, dividir, persistir manifesto, orquestrar, expor.
- **Backward Compatibility:** `get_context` adiciona um campo novo; ferramentas que ignoram campos extras continuam funcionando. `search_memory` já suporta filtro por escopo, então chunks de código são imediatamente buscáveis.

---

## 🚀 Estratégia de Implementação

### Phase 1 — Domain value object

1. Criar `src/domain/code_chunk.ts`.
   - Definir `CodeChunk` e `CodeChunkInput`.
   - Implementar `createCodeChunk` com id determinístico (`chunk_` + hash do caminho + startLine).
   - Implementar `codeChunkToMemory` que produz `MemoryInput` com `type: 'knowledge'`, `scope: 'project/<projectId>'`, `source: 'codebase-indexer'`, tags `['code', 'chunk', '<language>']`.
2. Criar `src/domain/code_chunk.test.ts`.

### Phase 2 — Ports

1. Criar `src/application/ports/codebase_scanner.ts`.
2. Criar `src/application/ports/code_chunker.ts`.
3. Criar `src/application/ports/codebase_index_repository.ts`.

### Phase 3 — Infrastructure adapters

1. Criar `src/infrastructure/file_codebase_scanner.ts`.
   - Implementar `.gitignore` parsing simples (comentários, blank lines, padrões `*`, `**`, prefixos `/`, sufixes `/`).
   - Filtros padrão de extensão expandidos: TypeScript/TSX/JSX/MTS/CTS, Java/JSP/JSPX, Python, C/C++/Rust/Go, .NET, Swift/Obj-C, web (HTML/HTM/XHTML/CSS/SCSS/SASS/LESS/Vue/Svelte/Astro), Ruby/ERB/PHP/PHTML/Perl, shell/scripts (SH/Bash/Zsh/Fish/PowerShell/BAT/CMD), config/data (JSON/JSONC/JSON5/YAML/TOML/XML/XSD/XSL/XSLT/INI/CFG/CONF/CONFIG/ENV/PROPERTIES), docs (MD/MDX/Markdown/RST/TXT), SQL, Docker, e arquivos especiais (`.eslintrc`, `.prettierrc`, `.babelrc`, `.editorconfig`, `.gitignore`, `Makefile`, `Rakefile`, `Gemfile`).
   - Limite de tamanho padrão 1 MB.
   - Excluir diretórios comuns (`node_modules`, `.git`, `dist`, `build`, `coverage`, `.venv`, `target`, etc.).
2. Criar `src/infrastructure/line_code_chunker.ts`.
   - Configurável: `chunkSizeLines` (default 50), `overlapLines` (default 10).
   - Prefixar cada chunk com comentário de origem (`// file: src/x.ts lines 1-50`).
   - Detectar linguagem pela extensão.
3. Criar `src/infrastructure/file_codebase_index_repository.ts`.
   - Persistir em `vault/CodebaseIndex/<projectId>.json`.
   - Tratar manifesto inexistente como `null`.
4. Criar `src/infrastructure/codebase_indexer.ts`.
   - Carregar manifesto anterior.
   - Calcular hash SHA-256 de cada arquivo.
   - Classificar arquivos em added/updated/removed/unchanged.
   - Para added/updated: chunkar, criar memórias, embeddar, salvar no repositório e no índice vetorial.
   - Para removed: deletar memórias antigas do repositório e do índice vetorial.
   - Atualizar manifesto (a menos que `dryRun`).
   - Em `force`: tratar todos os arquivos existentes como updated.
5. Criar testes para cada adapter.

### Phase 4 — Application use case

1. Criar `src/application/use_cases/index_codebase.ts`.
   - Resolver `projectId` via `ProjectResolver` se não fornecido.
   - Resolver `rootPath` (default `process.cwd()`).
   - Chamar `CodebaseIndexer.index`.
   - Retornar estatísticas.
2. Criar `src/application/use_cases/index_codebase.test.ts`.

### Phase 5 — Context integration

1. Modificar `src/domain/services/context_builder.ts`.
   - Adicionar `findCodeMemories` às dependências.
   - Adicionar `codeContext` ao `ContextOutput`.
   - Renderizar code context com file path e line range como cabeçalho.
2. Modificar `src/application/use_cases/get_context.ts`.
   - Implementar `findCodeMemories` buscando memórias do projeto com `source: 'codebase-indexer'`, ranqueadas por similaridade com `mode`.
   - Retornar `code_context`.
3. Atualizar testes.

### Phase 6 — Container wiring

1. Modificar `src/container_factory.ts`.
   - Instanciar `FileCodebaseScanner`, `LineCodeChunker`, `FileCodebaseIndexRepository`, `CodebaseIndexer`.
   - Expor no `Container` (opcional: manter indexer e/ou expor factory).
   - Como `Container` já é interface, adicionar campos opcionais para os novos componentes.

### Phase 7 — CLI

1. Adicionar comando `index` ao CLI.
   - `dblock index [path]` — indexa o projeto.
   - `--project <projectId>` — força project id.
   - `--force` — reindexa tudo.
   - `--dry-run` — mostra o que mudaria.
   - `--status` — mostra estatísticas do manifesto atual.
   - `--include-ext` e `--exclude-ext` — filtros de extensão (opcional, v1 pode omitir).
2. Mostrar spinner e resumo (scanned, indexed, removed, chunks).
3. Mostrar progresso em etapas: "Found N files", "Indexed X/Y files", "Saving index manifest...".

### Phase 8 — MCP server

1. Adicionar tool `index_codebase`.
   - Inputs: `project_id?`, `path?`, `force?`, `dry_run?`.
   - Output: estatísticas.
2. Atualizar `get_context` response schema para incluir `code_context`.
3. Adicionar testes de schema.

### Phase 9 — Living docs & verification

1. Atualizar `specs/living/diamondblock-core.md` para documentar o indexer.
2. Rodar `npm run typecheck`.
3. Rodar `npm test`.
4. Atualizar `.spec.yaml` status para `completed`.

---

## 🔌 Contracts & Stubs

### Domain helper

```ts
// src/domain/code_chunk.ts
export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
}

export interface CodeChunkInput {
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  content: string;
}

export function createCodeChunk(input: CodeChunkInput): CodeChunk;
export function codeChunkToMemory(chunk: CodeChunk, projectId: string): MemoryInput;
```

### Scanner port

```ts
// src/application/ports/codebase_scanner.ts
export interface SourceFile {
  absolutePath: string;
  relativePath: string;
}

export interface CodebaseScannerOptions {
  rootPath: string;
  includeExtensions?: string[];
  maxFileSizeBytes?: number;
  respectGitignore?: boolean;
}

export interface CodebaseScanner {
  scan(options: CodebaseScannerOptions): Promise<SourceFile[]>;
}
```

### Chunker port

```ts
// src/application/ports/code_chunker.ts
export interface CodeChunkerOptions {
  chunkSizeLines?: number;
  overlapLines?: number;
}

export interface CodeChunker {
  chunk(file: SourceFile, content: string, options?: CodeChunkerOptions): Promise<CodeChunkInput[]>;
}
```

### Index repository port

```ts
// src/application/ports/codebase_index_repository.ts
export interface FileIndexEntry {
  relativePath: string;
  contentHash: string;
  indexedAt: string;
  memoryIds: string[];
}

export interface CodebaseIndexManifest {
  projectId: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  files: Record<string, FileIndexEntry>;
}

export interface CodebaseIndexRepository {
  load(projectId: string): Promise<CodebaseIndexManifest | null>;
  save(manifest: CodebaseIndexManifest): Promise<void>;
  delete(projectId: string): Promise<void>;
}
```

### Use case

```ts
// src/application/use_cases/index_codebase.ts
export interface IndexCodebaseInput {
  projectPath?: string;
  projectId?: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface IndexCodebaseOutput {
  projectId: string;
  scanned: number;
  indexed: number;
  removed: number;
  chunksCreated: number;
  chunksRemoved: number;
}

export class IndexCodebaseUseCase {
  constructor(
    private readonly projectResolver: ProjectResolver,
    private readonly codebaseScanner: CodebaseScanner,
    private readonly codeChunker: CodeChunker,
    private readonly codebaseIndexRepository: CodebaseIndexRepository,
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider
  ) {}

  async execute(input: IndexCodebaseInput): Promise<IndexCodebaseOutput>;
}
```

### Orchestrator

```ts
// src/infrastructure/codebase_indexer.ts
export interface CodebaseIndexerOptions {
  scanner: CodebaseScanner;
  chunker: CodeChunker;
  indexRepository: CodebaseIndexRepository;
  memoryRepository: MemoryRepository;
  vectorIndex: VectorIndex;
  embeddingProvider: EmbeddingProvider;
}

export interface CodebaseIndexerResult {
  added: SourceFile[];
  updated: SourceFile[];
  removed: string[];
  unchanged: SourceFile[];
}

export class CodebaseIndexer {
  constructor(private readonly options: CodebaseIndexerOptions) {}

  async index(
    projectId: string,
    rootPath: string,
    options?: { force?: boolean; dryRun?: boolean }
  ): Promise<CodebaseIndexerResult>;
}
```

### Context builder

```ts
// src/domain/services/context_builder.ts
export interface ContextBuilderDependencies {
  findUserMemory(): Promise<Memory | null>;
  findProjectMemory(projectId: string): Promise<Memory | null>;
  findGlobalMemories(limit: number): Promise<Memory[]>;
  findRecentSessions(projectId: string, limit: number): Promise<Session[]>;
  findRelevantMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
  findCodeMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
}

export interface ContextOutput {
  userMemory: string;
  projectMemory: string;
  globalMemory: string;
  codeContext: string;
  recentSessions: string[];
  relevantMemories: string[];
}
```

---

## Test Plan

- **`CodeChunk`**
  - Id é determinístico para o mesmo input.
  - Conversão para `MemoryInput` gera scope correto, source e tags.

- **`FileCodebaseScanner`**
  - Ignora arquivos listados em `.gitignore`.
  - Ignora diretórios como `node_modules` e `.git`.
  - Filtra por extensão quando `includeExtensions` é fornecido.
  - Ignora arquivos maiores que `maxFileSizeBytes`.
  - Retorna caminhos relativos corretos.

- **`LineCodeChunker`**
  - Divide arquivo de 120 linhas em chunks de 50 com overlap 10.
  - Cada chunk inclui header com file path e line range.
  - Arquivo menor que chunk size gera um único chunk.

- **`FileCodebaseIndexRepository`**
  - Save/load round-trip preserva dados.
  - Load de manifesto inexistente retorna `null`.
  - Delete remove o arquivo.

- **`CodebaseIndexer`**
  - Primeira indexação marca todos os arquivos como added.
  - Reindexação sem mudanças marca todos como unchanged.
  - Edição de arquivo marca como updated e remove chunks antigos.
  - Remoção de arquivo deleta chunks antigos.
  - `force` reindexa mesmo arquivos inalterados.
  - `dryRun` não persiste nada.

- **`IndexCodebaseUseCase`**
  - Resolve projectId automaticamente quando omitido.
  - Propaga estatísticas corretamente.
  - Trata erro quando projeto não pode ser resolvido.

- **`ContextBuilder` / `GetContextUseCase`**
  - Inclui `codeContext` formatado.
  - Busca code memories por scope e source.
  - Limita número de snippets.

- **MCP server**
  - `index_codebase` tool é listada e aceita inputs.
  - `get_context` retorna `code_context`.

- **CLI**
  - `dblock index` parseia path, `--project`, `--force`, `--dry-run`.
  - Exibe resumo estatístico.

## Risk Assessment

- **Impact:** Medium-High. Adds new ports, adapters, use case, CLI command, MCP tool, and changes `get_context` output.
- **Compatibility:** Backward-compatible. `get_context` adds a new field; existing callers that ignore extra fields are unaffected. `search_memory` continues to work.
- **Performance:** First indexation of a large repo may be slow due to embedding generation. Local embedding is CPU-heavy. Mitigation: incremental hashing, file size limits, and optional force mode.
- **Storage:** Each chunk becomes a Markdown file + vector row. Large codebases may generate many files. Mitigation: reasonable chunk sizes and future garbage collection.
- **Reliability:** `.gitignore` parsing is lightweight and may miss complex patterns. Mitigation: allow explicit extension/size filters and document limitations.
- **Scope creep:** Resist adding AST parsing, real-time watching, or cross-project search in this change.

## Subagent Parallelization

**Recommended split into two sequential tracks.** The contracts for ports and the domain value object must stabilize before presentation work, but the indexer core and the context integration can be developed in parallel once contracts are defined.

```yaml
subagents:
  approved: true
  components:
    - name: "Indexer core"
      scope: "Domain value object, ports, scanner, chunker, index repository, CodebaseIndexer, IndexCodebaseUseCase, and their unit tests."
      files: "src/domain/code_chunk.ts, src/application/ports/codebase_scanner.ts, src/application/ports/code_chunker.ts, src/application/ports/codebase_index_repository.ts, src/infrastructure/file_codebase_scanner.ts, src/infrastructure/line_code_chunker.ts, src/infrastructure/file_codebase_index_repository.ts, src/infrastructure/codebase_indexer.ts, src/application/use_cases/index_codebase.ts, and corresponding test files."
      constraints: "Do NOT touch CLI, MCP, ContextBuilder, GetContextUseCase, or container_factory. Do NOT change existing Memory/VectorIndex contracts beyond normal usage."
    - name: "Presentation and context integration"
      scope: "Container wiring, CLI index command, MCP index_codebase tool, ContextBuilder code_context, GetContextUseCase wiring, and tests."
      files: "src/container_factory.ts, src/presentation/cli/index.ts, src/presentation/mcp/server.ts, src/domain/services/context_builder.ts, src/application/use_cases/get_context.ts, and corresponding test files."
      constraints: "Do NOT implement scanner/chunker/indexer logic. Reuse the contracts and adapters produced by track 1. Do NOT change existing CLI/MCP commands beyond adding the new ones."
```
