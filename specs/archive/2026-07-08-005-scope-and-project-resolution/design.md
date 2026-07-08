# Design: Improve Scope and Project Resolution

## 7 Analysis Questions

### 1. Domain and bounded context placement?

This change lives in the **Memory & Session Context** bounded context of DiamondBlock. It introduces a new domain value object for scope normalization, a new application port for project resolution, and extends the existing vector index and context builder contracts. Both presentation surfaces (MCP server and CLI) consume these abstractions, but the domain and application layers remain free of presentation concerns.

### 2. Core responsibilities of new/changed components?

- **`Scope` domain helper** (`src/domain/scope.ts`): validates and normalizes scope strings; defines the relationship between `MemoryType` and canonical scope; derives a default scope from type and optional projectId.
- **`ProjectInfo` / `ProjectResolver` application port** (`src/application/ports/project_resolver.ts`): abstracts how the current project is discovered. Keeps use cases and presentation decoupled from filesystem/git details.
- **`CwdProjectResolver` infrastructure adapter** (`src/infrastructure/cwd_project_resolver.ts`): implements project detection using cwd, git repository root, and optional config mappings.
- **`VectorIndex` port extension** (`src/application/ports/vector_index.ts`): adds optional scope filtering to `search` so the database can filter vectors by scope.
- **`SqliteVectorIndex`** (`src/infrastructure/sqlite_vector_index.ts`): implements scope-aware vector search by joining `vec_memories` with the metadata `memories` table.
- **`SearchMemoryUseCase`** (`src/application/use_cases/search_memory.ts`): uses scope-aware vector search; only falls back to keyword search when embeddings are unavailable.
- **`SaveMemoryUseCase` / `UpdateMemoryUseCase`**: normalize the input scope via the `Scope` helper before persisting.
- **`GetContextUseCase` / `ContextBuilder`**: include global/knowledge memories and fix user-memory filtering.
- **`YamlConfigStore` / `DiamondBlockConfig`**: optionally persist project-root mappings for repositories that are not git-backed.
- **MCP server**: accept optional `project_id` on more tools; return `scope` in search results; log resolved scope for observability.
- **CLI**: add `--project` option to memory and session commands; auto-detect project from cwd/git when not supplied.

### 3. Contracts to define or change?

```ts
// src/domain/scope.ts
export type ScopePrefix = 'user' | 'global' | 'project';

export interface ScopeInfo {
  prefix: ScopePrefix;
  projectId?: string;
  raw: string;
}

export class Scope {
  static readonly USER = 'user';
  static readonly GLOBAL = 'global';

  static normalize(scope: string): string;
  static fromTypeAndProject(type: MemoryType, projectId?: string): string;
  static parse(scope: string): ScopeInfo;
  static isProject(scope: string): boolean;
  static projectIdFromScope(scope: string): string | undefined;
}
```

```ts
// src/application/ports/project_resolver.ts
export interface ProjectInfo {
  projectId: string;
  source: 'cwd' | 'git' | 'config' | 'argument';
}

export interface ProjectResolver {
  resolve(fromPath?: string): Promise<ProjectInfo | null>;
}
```

```ts
// src/application/ports/vector_index.ts
export interface VectorSearchOptions {
  scope?: string;
}

export interface VectorIndex {
  index(memory: Memory, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
```

```ts
// src/application/use_cases/search_memory.ts
export interface SearchMemoryResult {
  id: string;
  title: string;
  score: number;
  scope: string;
  path: string;
}
```

```ts
// src/application/ports/config_store.ts
export interface DiamondBlockConfig {
  vaultPath: string;
  embeddingProvider: 'local' | 'openai';
  openaiApiKey?: string;
  openaiEmbeddingModel?: string;
  heartbeatIntervalMinutes: number;
  contextWindowTokens: number;
  projectRoots?: Record<string, string>; // projectId -> absolute path prefix
}
```

```ts
// src/application/use_cases/get_context.ts
export interface GetContextOutput {
  user_memory: string;
  project_memory: string;
  global_memory: string;
  recent_sessions: string[];
  relevant_memories: string[];
}
```

```ts
// src/domain/services/context_builder.ts
export interface ContextOutput {
  userMemory: string;
  projectMemory: string;
  globalMemory: string;
  recentSessions: string[];
  relevantMemories: string[];
}

export interface ContextBuilderDependencies {
  findUserMemory(): Promise<Memory | null>;
  findProjectMemory(projectId: string): Promise<Memory | null>;
  findGlobalMemories(limit: number): Promise<Memory[]>;
  findRecentSessions(projectId: string, limit: number): Promise<Session[]>;
  findRelevantMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
}
```

### 4. Which parts need tests per TDD skip criteria?

All changed components involve branching, external dependencies, or public API surface. **No component qualifies for test skip.**

Required tests:

- `Scope` helper — normalization, parsing, default scope derivation, invalid input handling.
- `CwdProjectResolver` — detection from cwd name, git root, config mappings, precedence rules.
- `SqliteVectorIndex` — scope-aware search returns only matching-scope vectors; graceful handling when no metadata row exists.
- `SearchMemoryUseCase` — uses scope-aware vector path; does not under-fetch when top vectors are out of scope; includes `scope` in results.
- `GetContextUseCase` / `ContextBuilder` — includes global memories; filters user memory by both `type` and `scope`.
- `SaveMemoryUseCase` / `UpdateMemoryUseCase` — normalizes scope before persistence.
- MCP server schema tests — optional `project_id`, returned `scope` field.
- CLI parsing — `--project` option passed through to use cases.

### 5. Architecture that minimizes ambiguity?

- **Clean Architecture / Hexagonal (Ports & Adapters):** Project detection is hidden behind `ProjectResolver`; scope normalization is a pure domain helper. Presentation never directly calls `fs` or `git`.
- **Value Object:** `Scope` encapsulates normalization rules, preventing inconsistent `type`/`scope` pairs from spreading through the codebase.
- **Repository Pattern extended:** `VectorIndex` behaves like a specialized repository for vectors; adding scope filtering keeps the contract small and explicit.
- **Tell, Don't Ask:** Use cases ask the `Scope` helper to normalize rather than inspecting and mutating strings themselves.
- **Explicit over implicit:** Every tool/command either resolves a project explicitly (argument) or transparently reports the source of auto-detection in debug logs.

### 6. Project structure changes needed?

```
src/
├── application/
│   ├── ports/
│   │   ├── project_resolver.ts          (NEW)
│   │   ├── vector_index.ts              (MODIFY)
│   │   └── config_store.ts              (MODIFY)
│   └── use_cases/
│       ├── save_memory.ts               (MODIFY)
│       ├── update_memory.ts             (MODIFY)
│       ├── search_memory.ts             (MODIFY)
│       └── get_context.ts               (MODIFY)
├── domain/
│   ├── scope.ts                         (NEW)
│   ├── memory.ts                        (NO CHANGE, uses Scope helper)
│   └── services/
│       └── context_builder.ts           (MODIFY)
├── infrastructure/
│   ├── cwd_project_resolver.ts          (NEW)
│   ├── sqlite_vector_index.ts           (MODIFY)
│   ├── yaml_config_store.ts             (MODIFY)
│   ├── file_memory_repository.ts        (NO CHANGE)
│   └── file_session_repository.ts       (NO CHANGE)
├── presentation/
│   ├── mcp/
│   │   └── server.ts                    (MODIFY)
│   └── cli/
│       └── index.ts                     (MODIFY)
├── container.ts                         (MODIFY)
└── container_factory.ts                 (MODIFY)

tests/
├── domain/scope.test.ts                 (NEW)
├── infrastructure/cwd_project_resolver.test.ts  (NEW)
├── infrastructure/sqlite_vector_index.test.ts   (MODIFY)
├── application/use_cases/search_memory.test.ts  (MODIFY)
├── application/use_cases/get_context.test.ts    (MODIFY)
├── application/use_cases/save_memory.test.ts    (MODIFY)
└── application/use_cases/update_memory.test.ts  (MODIFY)

specs/
├── changes/
│   └── 005-scope-and-project-resolution/       (NEW)
│       ├── .spec.yaml
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/
│           └── scope/
│               └── spec.md
└── living/
    └── diamondblock-core.md                    (MODIFY)
```

### 7. Key trade-offs?

- **Auto-detection vs explicit project_id:** Auto-detection is the default to reduce friction, but every entry point allows explicit override. This adds a small amount of magic; we mitigate it by logging the detected source.
- **Scope filtering in SQL vs application layer:** Pushing scope into `SqliteVectorIndex` prevents under-fetch but couples the vector query to the metadata table. The file repository continues to filter in memory because it is not performance-critical and keeps the adapter simple.
- **Including global memories in `get_context`:** Increases context size and potential noise, but captures knowledge that is currently invisible. We limit global memories to a small count (e.g., top 2) and rank them by relevance to the current mode.
- **Backward compatibility:** Existing memories with arbitrary scopes continue to be readable and searchable. New writes normalize scopes. This means a vault may temporarily contain both normalized and legacy scopes until edited.
- **Git dependency:** `CwdProjectResolver` prefers git root detection. Non-git projects rely on config mappings or fallback to directory name. This is acceptable for a developer-focused tool.

---

## 🧱 Padrões Aplicados

- **Clean Architecture / Hexagonal (Ports & Adapters):** O domínio (`Scope`) e a aplicação (`ProjectResolver` port) ficam no centro; adaptadores concretos (`CwdProjectResolver`, `SqliteVectorIndex`) implementam os contratos. A camada de apresentação depende apenas dos casos de uso e do container.
- **Value Object:** `Scope` centraliza regras de normalização e validação, evitando que strings de escopo sejam manipuladas diretamente em vários lugares.
- **Repository + Strategy:** `VectorIndex` já existia como uma porta; agora estendemos seu contrato para suportar filtro por escopo sem quebrar implementações futuras.
- **Tell, Don't Ask:** Os casos de uso pedem para `Scope` normalizar o escopo em vez de inspecionar manualmente o tipo e o projectId.
- **Anti-Corruption Layer (ACL):** `ProjectResolver` isola a lógica suja de detecção de projeto (cwd, git, config) dos casos de uso e do domínio.
- **Observabilidade por design:** O MCP e a CLI devem registrar a origem da resolução de projeto (`cwd`, `git`, `config`, `argument`) em logs de debug, tornando o comportamento transparente.

---

## 🚀 Estratégia de Implementação

### Phase 1 — Domain scope helper

1. Criar `src/domain/scope.ts`.
   - Implementar `Scope.normalize(scope)` — trim, lowercase, remover barras duplas, garantir formato `prefix[/suffix]`.
   - Implementar `Scope.fromTypeAndProject(type, projectId?)`:
     - `type === 'user'` → `'user'`
     - `type === 'project'` → `'project/${projectId}'` (projectId obrigatório)
     - `type === 'knowledge'` → `'global'`
     - `type === 'distilled'` → `'project/${projectId}'` (projectId obrigatório)
   - Implementar `Scope.parse(scope)` → `{ prefix, projectId?, raw }`.
   - Implementar `Scope.projectIdFromScope(scope)`.
2. Adicionar `src/domain/scope.test.ts` com casos de normalização, parsing e derivação.

### Phase 2 — Project resolver port and adapter

1. Criar `src/application/ports/project_resolver.ts` com `ProjectInfo` e `ProjectResolver`.
2. Criar `src/infrastructure/cwd_project_resolver.ts`.
   - Aceitar `ProjectResolverOptions` com `configStore` e `cwd` opcional para testes.
   - Ordem de prioridade:
     1. `fromPath` explícito, se fornecido.
     2. `config.projectRoots` — procurar prefixo de caminho absoluto que corresponda ao cwd.
     3. Git root — executar `git rev-parse --show-toplevel` (com fallback silencioso).
     4. Nome do diretório atual (kebab-case, normalizado).
   - Retornar `{ projectId, source }` ou `null`.
3. Adicionar `src/infrastructure/cwd_project_resolver.test.ts`.

### Phase 3 — Scope-aware vector index

1. Modificar `src/application/ports/vector_index.ts`:
   - Adicionar `VectorSearchOptions` com `scope?: string`.
   - Alterar `search(embedding, limit, options?)`.
2. Modificar `src/infrastructure/sqlite_vector_index.ts`:
   - Quando `options?.scope` for fornecido, fazer JOIN entre `vec_memories` e `memories` filtrando `memories.scope = ?`.
   - Se não houver `scope`, manter comportamento atual.
   - Garantir que `index()` insira/atualize a linha de metadados **antes** de inserir o vetor (já é feito, mas reforçar a ordem).
3. Atualizar `src/infrastructure/sqlite_vector_index.test.ts`.

### Phase 4 — Use case updates

1. `SaveMemoryUseCase` e `UpdateMemoryUseCase`:
   - Antes de chamar `createMemory`/`updateMemory`, normalizar `input.scope` com `Scope.normalize`.
   - Se `type === 'project'` ou `'distilled'` e o escopo não for de projeto, derivar do `projectId` quando disponível (a apresentação deve passar projectId ou scope; o caso de uso não faz detecção).
2. `SearchMemoryUseCase`:
   - Normalizar `input.scope`.
   - Passar `scope` para `vectorIndex.search`.
   - Remover o filtro por scope pós-busca (o índice já filtrou).
   - Adicionar `scope` no `SearchMemoryResult`.
   - Keyword fallback continua passando `scope` para `memoryRepository.search`.
3. `GetContextUseCase` / `ContextBuilder`:
   - Adicionar `findGlobalMemories(limit)`.
   - `findUserMemory` filtrar por `type: 'user'` **e** `scope: 'user'`.
   - `findRelevantMemories` retornar memórias do projeto **e** memórias globais, intercaladas/ranqueadas por score, limitadas a `relevantMemoryCount`.
   - Adicionar `globalMemory` na saída.

### Phase 5 — Container wiring

1. Modificar `src/container.ts` para incluir `projectResolver: ProjectResolver`.
2. Modificar `src/container_factory.ts`:
   - Instanciar `CwdProjectResolver`.
   - Injetar no container.
3. Garantir que CLI e MCP obtenham o container já completo.

### Phase 6 — MCP server

1. Atualizar schemas:
   - `search_memory`: adicionar `project_id?: string`. Se fornecido e `scope` omitido, derivar `scope = 'project/${project_id}'`.
   - `save_memory`: tornar `scope` opcional quando `type` e `project_id` são suficientes; adicionar `project_id?: string`.
   - `update_memory`: adicionar `project_id?: string`.
   - `get_context`: manter `project_id` obrigatório, mas aceitar detecção futura.
2. Resultado de `search_memory` incluir `scope`.
3. Adicionar log de debug indicando `project_id` e `scope` resolvidos.

### Phase 7 — CLI

1. Adicionar `--project <projectId>` global option e/ou por comando.
2. `memory search`:
   - Aceitar `--project` como alternativa a `--scope`.
   - Mostrar coluna `Scope` na tabela.
3. `memory add`:
   - Aceitar `--project` para derivar scope quando `--scope` não é fornecido.
   - Normalizar scope salvo.
4. `memory list`:
   - Aceitar `--project` como alias conveniente para `--scope project/<id>`.
5. `session list`:
   - Aceitar `--project` para filtrar.
6. Quando `--project` for omitido, usar `ProjectResolver.resolve(process.cwd())`.
7. Mostrar o projeto detectado em logs de debug/verbose.

### Phase 8 — Tests

1. Criar/atualizar testes unitários listados na seção 4.
2. Garantir que testes existentes de `SearchMemoryUseCase` e `GetContextUseCase` continuem passando com as mudanças de contrato.
3. Adicionar testes de integração leve para `CwdProjectResolver` com diretórios temporários.

### Phase 9 — Living docs & verification

1. Atualizar `specs/living/diamondblock-core.md` para refletir scope/project resolution.
2. Rodar `npm run typecheck`.
3. Rodar `npm test`.
4. Atualizar `.spec.yaml` status para `completed`.

---

## 🔌 Contracts & Stubs

### Domain helper

```ts
// src/domain/scope.ts
export type ScopePrefix = 'user' | 'global' | 'project';

export interface ScopeInfo {
  prefix: ScopePrefix;
  projectId?: string;
  raw: string;
}

export class Scope {
  static readonly USER = 'user';
  static readonly GLOBAL = 'global';

  static normalize(scope: string): string {
    // trim, lowercase, collapse slashes, ensure prefix[/suffix]
  }

  static fromTypeAndProject(type: MemoryType, projectId?: string): string {
    // user -> 'user', project/distilled -> 'project/${projectId}', knowledge -> 'global'
  }

  static parse(scope: string): ScopeInfo {
    // split into prefix and optional projectId
  }

  static isProject(scope: string): boolean {
    return Scope.parse(scope).prefix === 'project';
  }

  static projectIdFromScope(scope: string): string | undefined {
    return Scope.parse(scope).projectId;
  }
}
```

### Project resolver

```ts
// src/application/ports/project_resolver.ts
export interface ProjectInfo {
  projectId: string;
  source: 'cwd' | 'git' | 'config' | 'argument';
}

export interface ProjectResolver {
  resolve(fromPath?: string): Promise<ProjectInfo | null>;
}
```

### Vector index extension

```ts
// src/application/ports/vector_index.ts
export interface VectorSearchOptions {
  scope?: string;
}

export interface VectorIndex {
  index(memory: Memory, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number, options?: VectorSearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  close?(): Promise<void>;
}
```

### Search result

```ts
// src/application/use_cases/search_memory.ts
export interface SearchMemoryResult {
  id: string;
  title: string;
  score: number;
  scope: string;
  path: string;
}
```

### Context builder dependencies

```ts
// src/domain/services/context_builder.ts
export interface ContextBuilderDependencies {
  findUserMemory(): Promise<Memory | null>;
  findProjectMemory(projectId: string): Promise<Memory | null>;
  findGlobalMemories(limit: number): Promise<Memory[]>;
  findRecentSessions(projectId: string, limit: number): Promise<Session[]>;
  findRelevantMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
}
```

---

## Test Plan

- **`Scope` helper**
  - Normaliza strings com espaços, maiúsculas e barras duplas.
  - Deriva escopos padrão para cada `MemoryType`.
  - Rejeita ou corrige escopos de projeto sem projectId quando o tipo exige.
  - Faz round-trip parse/normalize.

- **`CwdProjectResolver`**
  - Resolve projeto a partir do nome do diretório.
  - Resolve projeto a partir do nome do repositório git.
  - Resolve projeto a partir de `config.projectRoots` quando cwd está sob o prefixo.
  - `argument` tem prioridade sobre `config`, que tem prioridade sobre `git`, que tem prioridade sobre `cwd`.
  - Retorna `null` quando não consegue resolver e não há fallback.

- **`SqliteVectorIndex`**
  - Busca sem scope retorna vetores de todos os escopos.
  - Busca com scope retorna apenas vetores do escopo solicitado.
  - Candidatos fora do escopo não aparecem mesmo que sejam mais similares.

- **`SearchMemoryUseCase`**
  - Passa scope para `vectorIndex.search`.
  - Retorna `scope` em cada resultado.
  - Retorna exatamente `limit` resultados quando existem memórias in-scope suficientes.
  - Fallback keyword ainda funciona quando embeddings indisponíveis.

- **`GetContextUseCase` / `ContextBuilder`**
  - Inclui memórias `type: 'knowledge'`, `scope: 'global'` em `global_memory`.
  - `user_memory` só retorna memórias com `type: 'user'` **e** `scope: 'user'`.
  - `relevant_memories` mistura projeto e global, respeitando o limite.

- **`SaveMemoryUseCase` / `UpdateMemoryUseCase`**
  - Normaliza scope antes de salvar.
  - Quando type é project/distilled e projectId é fornecido, escopo resultante é `project/<projectId>`.

- **MCP server**
  - `search_memory` aceita `project_id` opcional e retorna `scope`.
  - `save_memory` aceita `project_id` opcional e `scope` opcional (um dos dois deve produzir escopo válido).
  - `update_memory` aceita `project_id` opcional.

- **CLI**
  - `--project` é propagado como scope.
  - `memory search` mostra coluna Scope.
  - `session list --project` filtra corretamente.

## Risk Assessment

- **Impact:** Medium-High. Touches the vector index contract, context builder, MCP schemas, and CLI surface.
- **Compatibility:** Backward-compatible for read operations. New writes normalize scopes, which changes behavior for callers that previously stored arbitrary scopes. We mitigate by normalizing only when the caller does not supply an explicit scope, and by preserving existing files unchanged.
- **Performance:** Scope-aware vector search may be slightly slower due to JOIN, but it reduces the number of candidate memories loaded from disk. Net impact should be neutral or positive.
- **Reliability:** Git detection adds an external process call. We must wrap it with a timeout and swallow errors gracefully, falling back to directory name.
- **User surprise:** Auto-detection may assign an unexpected projectId. We mitigate by logging the detected project and allowing explicit override via `--project` or `scope`.

## Subagent Parallelization

**Not recommended as fully independent subagents.** The changes share several contracts (`Scope`, `VectorIndex.search`, `ContextBuilderDependencies`) and a single PR diff is easier to review cohesively. However, the work can be split into two sequential tracks if desired:

1. **Core infrastructure track** (domain + application ports + project resolver + vector index + use cases).
2. **Presentation track** (MCP server + CLI + container wiring + tests), which depends on the contracts stabilized by track 1.

For this spec, we recommend sequential implementation by a single Engineer to keep the scope transformation consistent across all surfaces.
