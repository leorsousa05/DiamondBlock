# Design: Fix memory edit bug and id/path drift

## 7 Analysis Questions

### 1. Domain and bounded context placement?

This change lives inside the **Memory Management** bounded context.
It touches four Clean Architecture layers:

- **Presentation:** `src/presentation/cli/index.ts` — command parsing and
  editor interaction.
- **Application:** `src/application/use_cases/update_memory.ts`,
  `src/application/use_cases/search_memory.ts`, and
  `src/application/ports/memory_repository.ts` — orchestration and contracts.
- **Domain:** `src/domain/memory.ts` — `updateMemory()` already preserves
  identity and `createdAt`.
- **Infrastructure:** `src/infrastructure/file_memory_repository.ts` and
  `src/infrastructure/markdown_serializer.ts` — concrete persistence and
  serialization.

### 2. Core responsibilities of new/changed components?

- **CLI `memory edit`:** read existing memory, launch editor, parse the
  resulting Markdown, and dispatch an update while preserving the original id.
- **`UpdateMemoryUseCase`:** load the existing memory, merge changes through
  the pure `updateMemory` domain function, and ask the repository to persist
  it.
- **`FileMemoryRepository.save()`:** write the memory to its canonical path
  and remove any stale file that previously held the same id.
- **`FileMemoryRepository.listAll()`:** rebuild the in-memory list using the
  real memory id (frontmatter first, basename fallback).
- **`FileMemoryRepository.resolvePath()`:** expose the canonical persistence
  path for a memory so other components do not reconstruct it independently.
- **`SearchMemoryUseCase`:** delegate path formatting to the repository via
  `resolvePath()` instead of duplicating layout logic.

### 3. Contracts to define or change?

The `MemoryRepository` port gains one read-model method:

```ts
export interface MemoryRepository {
  findById(id: string): Promise<Memory | null>;
  search(options: SearchOptions): Promise<Memory[]>;
  save(memory: Memory): Promise<void>;
  delete(id: string): Promise<void>;
  list(options?: ListOptions): Promise<Memory[]>;
  resolvePath(memory: Memory): string; // NEW
}
```

`UpdateMemoryUseCase` input remains:

```ts
export interface UpdateMemoryInput {
  id: string;
  title?: string;
  content?: string;
  type?: MemoryInput['type'];
  scope?: string;
  tags?: string[];
  confidence?: number;
  append?: boolean;
}
```

`SearchMemoryResult` keeps its shape:

```ts
export interface SearchMemoryResult {
  id: string;
  title: string;
  score: number;
  path: string;
}
```

### 4. Which parts need tests per TDD skip criteria?

All changed components have branching, side effects, external dependencies
(file I/O), or public API surface. **No component qualifies for test skip.**

Required tests:

- Repository relocation logic when type/scope changes.
- Repository id derivation for nested directories.
- Repository `resolvePath()` output.
- Search use case path delegation.
- Update use case identity preservation and field merging.

### 5. Architecture that minimizes ambiguity?

- **Clean Architecture / Ports & Adapters:** The port defines the contract;
  only the file-system adapter knows the path layout.
- **Repository pattern:** The repository is treated as a collection of
  memories; callers say `save(memory)` and the adapter handles relocation.
- **Single Responsibility:** The CLI does not know how files are laid out.
  The use case does not know about Markdown. The serializer does not know
  about repositories.
- **Tell, Don't Ask:** The use case tells the repository to save; the
  repository decides whether a move is required.

### 6. Project structure changes needed?

No new source directories. The layout stays:

```
src/
├── application/
│   ├── ports/
│   │   └── memory_repository.ts       (add resolvePath)
│   └── use_cases/
│       ├── search_memory.ts           (use resolvePath)
│       └── update_memory.ts           (unchanged signature)
├── domain/
│   └── memory.ts                      (unchanged)
├── infrastructure/
│   ├── file_memory_repository.ts      (move + id fix + resolvePath)
│   └── markdown_serializer.ts         (unchanged)
└── presentation/
    └── cli/
        └── index.ts                   (edit uses UpdateMemoryUseCase)
```

New test file:

```
src/application/use_cases/update_memory.test.ts
```

### 7. Key trade-offs?

- **Adding `resolvePath` to the `MemoryRepository` port** leaks a locational
  concern into the repository abstraction. The alternative is a separate
  `MemoryPathResolver` port, but that adds a constructor dependency across
  CLI and MCP server for a single synchronous call. Keeping it in the
  repository is the pragmatic choice for this fix.
- **Using `findById()` inside `save()`** adds a directory walk on every update.
  This is acceptable because memory collections are small and local; a future
  optimization could cache id-to-path mapping.
- **Frontmatter as the source of truth for ids** means legacy files without
  frontmatter fall back to the file basename. This matches how `findById`
  locates files and preserves compatibility.

---

## 🧱 Padrões Aplicados

- **Clean Architecture / Hexagonal (Ports & Adapters):** O domínio permanece
  no centro; a mudança adiciona uma query de leitura ao port
  `MemoryRepository`, implementada apenas pelo adaptador de arquivo.
- **Repository:** A persistência é abstraída como uma coleção em memória; o
  adaptador decide se uma alteração de tipo/escopo exige mover o arquivo.
- **Single Responsibility Principle:** CLI orquestra, caso de uso aplica
  regras, repositório gerencia caminhos, serializador converte Markdown.
- **Tell, Don't Ask:** O caso de uso diz ao repositório "salve esta memória";
  o repositório internamente resolve se há arquivo obsoleto a remover.

---

## 🚀 Estratégia de Implementação

1. **Atualizar o contrato do port.**
   - Adicionar `resolvePath(memory: Memory): string` em
     `MemoryRepository`.

2. **Implementar `resolvePath` e mover arquivo no adaptador.**
   - Tornar o método privado `resolvePath` de `FileMemoryRepository` público.
   - Em `save()`, buscar arquivo existente pelo id; se existir e o novo
     caminho for diferente, removê-lo antes de escrever.

3. **Corrigir derivação de id em `listAll()`.**
   - Usar `fm.id` do frontmatter quando disponível.
   - Caso contrário, usar `basename(file, '.md')` (apenas o nome do arquivo,
     não o caminho completo).

4. **Alinhar `SearchMemoryUseCase`.**
   - Substituir o helper `memoryPath` por
     `this.memoryRepository.resolvePath(memory)`.

5. **Reescrever o comando CLI `memory edit`.**
   - Carregar memória por id.
   - Abrir `memoryToMarkdown(memory)` no editor.
   - Fazer parse do resultado com `memoryFromMarkdown(originalId, updated)`.
   - Chamar `UpdateMemoryUseCase` com o id original e os campos parseados
     (exceto id).

6. **Adicionar e atualizar testes unitários.**
   - Repositório: movimentação, id aninhado, `resolvePath`.
   - `SearchMemoryUseCase`: path proveniente do repositório.
   - `UpdateMemoryUseCase`: novos casos de atualização.

7. **Verificar.**
   - `npm run typecheck`
   - `npm test`

---

## 🔌 Contracts & Stubs

### Port change

```ts
// src/application/ports/memory_repository.ts
export interface MemoryRepository {
  findById(id: string): Promise<Memory | null>;
  search(options: SearchOptions): Promise<Memory[]>;
  save(memory: Memory): Promise<void>;
  delete(id: string): Promise<void>;
  list(options?: ListOptions): Promise<Memory[]>;
  resolvePath(memory: Memory): string;
}
```

### Adapter signatures

```ts
// src/infrastructure/file_memory_repository.ts
export class FileMemoryRepository implements MemoryRepository {
  constructor(options: FileMemoryRepositoryOptions);
  findById(id: string): Promise<Memory | null>;
  search(options: SearchOptions): Promise<Memory[]>;
  save(memory: Memory): Promise<void>;
  delete(id: string): Promise<void>;
  list(options?: ListOptions): Promise<Memory[]>;
  resolvePath(memory: Memory): string;
}
```

### Use-case signatures (unchanged)

```ts
// src/application/use_cases/update_memory.ts
export class UpdateMemoryUseCase {
  constructor(
    memoryRepository: MemoryRepository,
    vectorIndex: VectorIndex,
    embeddingProvider: EmbeddingProvider
  );
  execute(input: UpdateMemoryInput): Promise<void>;
}

// src/application/use_cases/search_memory.ts
export class SearchMemoryUseCase {
  constructor(
    memoryRepository: MemoryRepository,
    vectorIndex: VectorIndex,
    embeddingProvider: EmbeddingProvider
  );
  execute(input: SearchMemoryInput): Promise<SearchMemoryResult[]>;
}
```

---

## Test Plan

- **FileMemoryRepository**
  - `save()` moves the file when `type` changes.
  - `save()` moves the file when `scope` changes.
  - `save()` leaves the file in place when nothing changes.
  - `list()` returns the correct id for a project-scoped memory.
  - `resolvePath()` matches the path used by `save()`.

- **SearchMemoryUseCase**
  - Returns `path` from `memoryRepository.resolvePath()`.

- **UpdateMemoryUseCase**
  - Updates title/content and preserves id and `createdAt`.
  - Updates type/scope and triggers repository relocation.
  - Appends content when `append: true`.
  - Throws when memory is not found.

## Risk Assessment

- **Impact:** Low to medium. Only the memory edit flow and search path
  display change behavior.
- **Compatibility:** Existing vaults remain readable because frontmatter ids
  and basename fallbacks match the real ids.
- **MCP compatibility:** `search_memory` result shape is unchanged; only the
  `path` value becomes correct.
- **Rollback:** Revert the spec branch; no migrations needed.

## Subagent Parallelization

Not suitable. The changes are tightly coupled through the
`MemoryRepository` port and `FileMemoryRepository` adapter. Sequential
implementation is safer and keeps the diff reviewable.
