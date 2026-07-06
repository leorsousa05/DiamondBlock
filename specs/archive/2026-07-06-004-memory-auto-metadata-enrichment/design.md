# Design: Automatic Memory Metadata Enrichment

## 7 Analysis Questions

### 1. Domain and bounded context placement?

This change lives in the **Memory Management** bounded context of
DiamondBlock. It introduces a new domain service that orchestrates metadata
extraction and a new infrastructure adapter that performs local, rule-based
NLP. The use cases (`SaveMemoryUseCase`, `UpdateMemoryUseCase`) trigger the
service, but the service itself is independent of presentation layers.

### 2. Core responsibilities of new/changed components?

- **`EnrichmentProvider` port:** defines how to generate candidate metadata
  from a memory. Keeps the domain decoupled from extraction algorithms.
- **`LocalEnrichmentProvider` adapter:** implements the port using local
  heuristics — tokenization, stop-word filtering, identifier parsing, and
  simple summary generation.
- **`MemoryEnrichmentService` domain service:** coordinates the enrichment
  pipeline. It calls the provider, queries similar memories to infer extra
  tags, merges and deduplicates results, checks confidence, and persists
  updates.
- **`SaveMemoryUseCase` / `UpdateMemoryUseCase`:** trigger enrichment
  asynchronously after the memory has been saved and indexed.
- **`memory.ts` domain model:** adds optional `summary` and `entities` fields.
- **`markdown_serializer.ts`:** persists and restores the new fields.

### 3. Contracts to define or change?

```ts
// src/application/ports/enrichment_provider.ts
export interface EnrichmentResult {
  tags: string[];
  summary: string;
  entities: string[];
  confidence: number;
}

export interface EnrichmentProvider {
  enrich(memory: Memory): Promise<EnrichmentResult>;
}
```

```ts
// src/domain/services/memory_enrichment.ts
export interface MemoryEnrichmentOptions {
  confidenceThreshold?: number;
  maxTags?: number;
  maxEntities?: number;
}

export class MemoryEnrichmentService {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly enrichmentProvider: EnrichmentProvider,
    private readonly options?: MemoryEnrichmentOptions
  );

  async enrich(memory: Memory): Promise<void>;
}
```

```ts
// src/domain/memory.ts
export interface Memory {
  id: string;
  type: MemoryType;
  scope: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  source: string;
  tags: string[];
  confidence: number;
  summary?: string;
  entities?: string[];
}

export interface MemoryInput {
  type: MemoryType;
  scope: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  confidence?: number;
  summary?: string;
  entities?: string[];
}
```

### 4. Which parts need tests per TDD skip criteria?

All new components have branching, side effects, external dependencies, or
public API surface. **No component qualifies for test skip.**

Required tests:

- `LocalEnrichmentProvider` — tag/entity/summary extraction from sample text.
- `MemoryEnrichmentService` — merging with similar-memory tags, threshold
  behavior, repository update calls, no-update when confidence is low.
- `SaveMemoryUseCase` / `UpdateMemoryUseCase` — trigger enrichment
  asynchronously without blocking return.
- `markdown_serializer` — round-trip of `summary` and `entities`.

### 5. Architecture that minimizes ambiguity?

- **Clean Architecture / Ports & Adapters:** The extraction algorithm is hidden
  behind `EnrichmentProvider`. The orchestration logic is a domain service.
- **Strategy Pattern:** `EnrichmentProvider` allows future implementations
  (local, model-based, cloud) without changing use cases.
- **Pipeline Pattern:** Enrichment is a sequence of discrete steps
  (extract → infer → merge → threshold → persist).
- **Asynchronous Decoupling:** Use cases fire enrichment without awaiting it,
  preserving save latency.

### 6. Project structure changes needed?

```
src/
├── application/
│   ├── ports/
│   │   └── enrichment_provider.ts       (NEW)
│   └── use_cases/
│       ├── save_memory.ts               (MODIFY)
│       └── update_memory.ts             (MODIFY)
├── domain/
│   ├── memory.ts                        (MODIFY)
│   └── services/
│       └── memory_enrichment.ts         (NEW)
├── infrastructure/
│   ├── local_enrichment_provider.ts     (NEW)
│   ├── markdown_serializer.ts           (MODIFY)
│   └── container_factory.ts             (MODIFY)
└── presentation/
    └── mcp/
        └── server.ts                    (NO CHANGE, transparent)

tests/
├── domain/services/memory_enrichment.test.ts              (NEW)
├── infrastructure/local_enrichment_provider.test.ts       (NEW)
└── application/use_cases/save_memory.test.ts              (MODIFY)
```

### 7. Key trade-offs?

- **Local rule-based extraction vs. local LLM / transformer model:** We choose
  rule-based extraction to keep startup fast, avoid large model downloads, and
  stay deterministic. The `EnrichmentProvider` port allows a smarter adapter
  later.
- **Synchronous vs. asynchronous enrichment:** Asynchronous keeps the MCP
  tool response fast, but failures are not reported to the caller. We accept
  this because enrichment is best-effort.
- **Confidence threshold vs. always apply:** A threshold prevents low-quality
  metadata from overwriting caller-provided values. The default threshold
  should be conservative.
- **Querying similar memories:** This adds an extra embedding + vector search
  per enrichment. Acceptable for local single-user usage; can be disabled via
  options if needed.

---

## 🧱 Padrões Aplicados

- **Clean Architecture / Hexagonal (Ports & Adapters):** O algoritmo de
  enriquecimento fica atrás da porta `EnrichmentProvider`; o domínio só
  conhece o contrato.
- **Strategy:** `EnrichmentProvider` permite trocar a implementação de
  enriquecimento sem alterar os casos de uso.
- **Pipeline:** O serviço de enriquecimento executa passos bem definidos
  (extrair → inferir → mesclar → validar → persistir).
- **Async Decoupling:** Os casos de uso disparam o enriquecimento sem
  `await`, preservando a latência das ferramentas MCP.

---

## 🚀 Estratégia de Implementação

1. **Adicionar campos ao domínio.**
   - Incluir `summary?: string` e `entities?: string[]` em `Memory` e
     `MemoryInput`.
   - Atualizar `updateMemory` para preservar valores existentes quando não
     fornecidos.

2. **Criar o contrato `EnrichmentProvider`.**
   - Definir `EnrichmentResult` e a interface no port.

3. **Implementar `LocalEnrichmentProvider`.**
   - Tokenizar título e conteúdo.
   - Filtrar stop-words comuns em inglês.
   - Extrair identificadores em camelCase/PascalCase.
   - Detectar linguagens/tecnologias conhecidas.
   - Gerar `summary` a partir da primeira sentença ou dos primeiros termos.
   - Calcular `confidence` com base no tamanho do conteúdo e na densidade de
     extrações.

4. **Criar `MemoryEnrichmentService`.**
   - Receber `MemoryRepository`, `VectorIndex`, `EmbeddingProvider`,
     `EnrichmentProvider` e opções.
   - Implementar `enrich(memory)`:
     a. Chamar `enrichmentProvider.enrich(memory)`.
     b. Se `embeddingProvider.isAvailable()`, buscar memórias similares via
        `vectorIndex.search` e coletar tags delas.
     c. Mesclar tags, remover duplicatas e limitar a `maxTags`.
     d. Se `confidence >= threshold`, atualizar a memória com novos metadados.
     e. Persistir via `memoryRepository.save`.

5. **Modificar os casos de uso.**
   - Em `SaveMemoryUseCase.execute` e `UpdateMemoryUseCase.execute`, após
     salvar/indexar, chamar `enrichmentService.enrich(memory)` sem `await`.
   - Garantir que o retorno do caso de uso não dependa do enriquecimento.

6. **Atualizar serialização.**
   - Incluir `summary` e `entities` no frontmatter do Markdown.
   - Garantir compatibilidade retroativa com arquivos sem esses campos.

7. **Atualizar container factory.**
   - Instanciar `LocalEnrichmentProvider` e `MemoryEnrichmentService`.
   - Injetar o serviço nos casos de uso.

8. **Adicionar testes.**
   - Testes unitários para `LocalEnrichmentProvider`.
   - Testes unitários para `MemoryEnrichmentService` com repositório e índice
     falsos.
   - Testes de integração leve para os casos de uso verificando chamada
     assíncrona.
   - Testes de round-trip do serializador.

9. **Verificar.**
   - `npm run typecheck`
   - `npm test`

---

## 🔌 Contracts & Stubs

### Port

```ts
// src/application/ports/enrichment_provider.ts
import type { Memory } from '../../domain/memory.js';

export interface EnrichmentResult {
  tags: string[];
  summary: string;
  entities: string[];
  confidence: number;
}

export interface EnrichmentProvider {
  enrich(memory: Memory): Promise<EnrichmentResult>;
}
```

### Domain service

```ts
// src/domain/services/memory_enrichment.ts
import type { Memory } from '../memory.js';
import type { MemoryRepository } from '../../application/ports/memory_repository.js';
import type { VectorIndex } from '../../application/ports/vector_index.js';
import type { EmbeddingProvider } from '../../application/ports/embedding_provider.js';
import type { EnrichmentProvider, EnrichmentResult } from '../../application/ports/enrichment_provider.js';

export interface MemoryEnrichmentOptions {
  confidenceThreshold?: number;
  maxTags?: number;
  maxEntities?: number;
}

export class MemoryEnrichmentService {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly vectorIndex: VectorIndex,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly enrichmentProvider: EnrichmentProvider,
    private readonly options: MemoryEnrichmentOptions = {}
  );

  async enrich(memory: Memory): Promise<void>;
}
```

### Adapter

```ts
// src/infrastructure/local_enrichment_provider.ts
import type { Memory } from '../domain/memory.js';
import type { EnrichmentProvider, EnrichmentResult } from '../application/ports/enrichment_provider.js';

export interface LocalEnrichmentProviderOptions {
  stopWords?: Set<string>;
  techTerms?: Set<string>;
}

export class LocalEnrichmentProvider implements EnrichmentProvider {
  constructor(options?: LocalEnrichmentProviderOptions);
  enrich(memory: Memory): Promise<EnrichmentResult>;
}
```

### Updated use-case signatures

```ts
// src/application/use_cases/save_memory.ts
export class SaveMemoryUseCase {
  constructor(
    memoryRepository: MemoryRepository,
    vectorIndex: VectorIndex,
    embeddingProvider: EmbeddingProvider,
    enrichmentService?: MemoryEnrichmentService
  );
  execute(input: SaveMemoryInput): Promise<{ id: string }>;
}

// src/application/use_cases/update_memory.ts
export class UpdateMemoryUseCase {
  constructor(
    memoryRepository: MemoryRepository,
    vectorIndex: VectorIndex,
    embeddingProvider: EmbeddingProvider,
    enrichmentService?: MemoryEnrichmentService
  );
  execute(input: UpdateMemoryInput): Promise<void>;
}
```

---

## Test Plan

- **`LocalEnrichmentProvider`**
  - Extracts tags from title and content.
  - Filters stop-words.
  - Extracts camelCase/PascalCase identifiers.
  - Detects known technology terms.
  - Generates a summary from the first sentence.
  - Returns zero confidence for very short content.

- **`MemoryEnrichmentService`**
  - Updates a memory when confidence is above threshold.
  - Does not update when confidence is below threshold.
  - Merges inferred tags from similar memories.
  - Respects `maxTags` and `maxEntities`.
  - Skips vector inference when embeddings are unavailable.
  - Does not overwrite caller-provided tags unless enrichment is better.

- **Use cases**
  - `SaveMemoryUseCase` returns id before enrichment finishes.
  - `UpdateMemoryUseCase` returns before enrichment finishes.
  - Enrichment service is invoked with the saved memory.

- **Serializer**
  - Round-trips `summary` and `entities`.
  - Reads legacy files without the new fields.

## Risk Assessment

- **Impact:** Medium. Touches the memory domain model, serializer, and both
  write use cases.
- **Compatibility:** Fully backward-compatible because `summary` and
  `entities` are optional and legacy files parse normally.
- **Performance:** Asynchronous enrichment prevents blocking, but local
  extraction must remain fast. Monitor tokenization cost.
- **Quality:** Rule-based extraction will not match LLM quality. The
  `EnrichmentProvider` port lets us upgrade later.

## Subagent Parallelization

Not suitable. The components are tightly coupled through the
`MemoryEnrichmentService` and the `Memory` domain model. Sequential
implementation keeps the diff reviewable and the tests coherent.
