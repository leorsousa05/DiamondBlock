# Design: DiamondBlock Core

## Architecture Overview

DiamondBlock adota uma arquitetura de **Modular Monolith** com princípios de **Clean Architecture / Hexagonal**:

- O domínio (`src/domain`) é independente de frameworks, CLI, MCP e filesystem.
- As ports (`src/application/ports`) definem contratos de persistência, embeddings e indexação.
- Os adapters (`src/infrastructure`) implementam essas ports usando bibliotecas concretas.
- As interfaces de entrada (`src/presentation`) são MCP server e CLI, ambos finos.

```
src/
├── domain/              # Entidades, value objects, regras de negócio
│   ├── memory.ts
│   ├── session.ts
│   ├── profile.ts
│   └── services/
│       ├── context_builder.ts
│       ├── distiller.ts
│       └── memory_service.ts
├── application/         # Casos de uso e ports
│   ├── ports/
│   │   ├── memory_repository.ts
│   │   ├── session_repository.ts
│   │   ├── vector_index.ts
│   │   ├── embedding_provider.ts
│   │   └── config_store.ts
│   └── use_cases/
│       ├── get_context.ts
│       ├── save_memory.ts
│       ├── search_memory.ts
│       ├── log_session.ts
│       └── distill_sessions.ts
├── infrastructure/      # Adapters concretos
│   ├── file_memory_repository.ts
│   ├── file_session_repository.ts
│   ├── sqlite_vector_index.ts
│   ├── local_embedding_provider.ts
│   ├── openai_embedding_provider.ts
│   └── yaml_config_store.ts
└── presentation/        # Entradas
    ├── mcp/
    │   ├── server.ts
    │   └── tools/
    │       ├── get_context.ts
    │       ├── search_memory.ts
    │       ├── save_memory.ts
    │       ├── update_memory.ts
    │       ├── delete_memory.ts
    │       └── log_session.ts
    └── cli/
        ├── index.ts
        └── commands/
            ├── init.ts
            ├── memory.ts
            ├── session.ts
            ├── distill.ts
            └── status.ts
```

## [Padrões Aplicados]

- **Clean Architecture / Hexagonal (Ports & Adapters)** — domínio no centro, infraestrutura depende dele, não o contrário. Isso permite trocar CLI por UI web, MCP por HTTP, ou filesystem por S3 sem tocar nas regras de negócio.
- **Repository Pattern** — abstrai persistência como coleção em memória. `MemoryRepository` e `SessionRepository` escondem a complexidade de arquivos Markdown + frontmatter.
- **Strategy Pattern** — `EmbeddingProvider` permite alternar entre modelo local e API externa sem impactar o restante do sistema.
- **CQRS leve** — leitura de contexto (`get_context`) e busca (`search_memory`) são otimizadas para retorno rápido, enquanto escrita e distilação são comandos assíncronos.
- **Event Notification** — sessões logadas disparam notificação para o `Distiller` agendar destilação.
- **Anti-Corruption Layer (ACL)** — adapters MCP e CLI traduzem payloads externos para os DTOs da aplicação, protegendo o domínio.

## [Estratégia de Implementação]

1. **Setup do projeto**: `package.json`, `tsconfig.json`, vitest, biome/prettier.
2. **Domínio e ports**: implementar entidades e contratos abstratos primeiro.
3. **Infraestrutura de arquivos**: `FileMemoryRepository`, `FileSessionRepository` com parse/generate de Markdown + frontmatter.
4. **Índice vetorial**: `SqliteVectorIndex` usando `sqlite-vec` ou `vectordb`; embeddings via `local_embedding_provider` (transformers.js ou onnxruntime).
5. **Casos de uso**: `get_context`, `save_memory`, `search_memory`, `log_session`, `distill_sessions`.
6. **MCP server**: registrar tools e conectar casos de uso.
7. **CLI**: comandos essenciais com output rico.
8. **Heartbeat**: agendador simples usando `node-cron` ou `setInterval` para distilação periódica.
9. **Testes**: unidade para domínio, integração para repositories e MCP, e2e para CLI.

## Contracts & Stubs

### Domain Entities

```typescript
// src/domain/memory.ts
export type MemoryType = 'user' | 'project' | 'knowledge' | 'distilled';

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
}

// src/domain/session.ts
export interface SessionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  projectId: string;
  createdAt: Date;
  messages: SessionMessage[];
}

// src/domain/profile.ts
export interface UserProfile {
  name?: string;
  preferences: Record<string, string>;
  rules: string[];
}

export interface ProjectProfile {
  id: string;
  name: string;
  description?: string;
  decisions: string[];
}
```

### Application Ports

```typescript
// src/application/ports/memory_repository.ts
export interface MemoryRepository {
  findById(id: string): Promise<Memory | null>;
  search(query: string, options: SearchOptions): Promise<Memory[]>;
  save(memory: Memory): Promise<void>;
  delete(id: string): Promise<void>;
  list(options: ListOptions): Promise<Memory[]>;
}

// src/application/ports/vector_index.ts
export interface VectorIndex {
  index(memory: Memory, embedding: number[]): Promise<void>;
  search(embedding: number[], limit: number): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
}

// src/application/ports/embedding_provider.ts
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  isAvailable(): Promise<boolean>;
}
```

### Use Cases

```typescript
// src/application/use_cases/get_context.ts
export interface GetContextInput {
  sessionId: string;
  projectId: string;
  mode?: string;
}

export interface GetContextOutput {
  userMemory: string;
  projectMemory: string;
  recentSessions: string[];
  relevantMemories: string[];
}

export interface GetContextUseCase {
  execute(input: GetContextInput): Promise<GetContextOutput>;
}

// src/application/use_cases/search_memory.ts
export interface SearchMemoryInput {
  query: string;
  scope?: string;
  limit?: number;
}

export interface SearchMemoryResult {
  id: string;
  title: string;
  score: number;
  path: string;
}

export interface SearchMemoryUseCase {
  execute(input: SearchMemoryInput): Promise<SearchMemoryResult[]>;
}
```

### MCP Tools Schemas (stubs)

```typescript
// src/presentation/mcp/tools/get_context.ts
export const getContextInputSchema = z.object({
  session_id: z.string(),
  project_id: z.string(),
  mode: z.string().optional(),
});

export const getContextOutputSchema = z.object({
  user_memory: z.string(),
  project_memory: z.string(),
  recent_sessions: z.array(z.string()),
  relevant_memories: z.array(z.string()),
});
```

## Test Plan

- **Unit tests**: domínio (`Memory`, `Session`, `ContextBuilder`, `Distiller`).
- **Integration tests**: repositories de arquivo, índice vetorial SQLite, providers de embedding.
- **Contract tests**: schemas de entrada/saída das tools MCP.
- **E2E tests**: CLI via execução em processo filho e MCP server via stdio mock.

## Risk Assessment

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Embeddings locais lentos/grandes | Alto | Usar modelo leve (all-MiniLM-L6-v2 via onnxruntime); fallback para API externa |
| Concorrência de escrita CLI/agente | Médio | File locking simples; sessões append-only |
| Distilação perder informação | Médio | Sempre manter logs brutos; memória curada é derivada |
| MCP stdio compatibilidade | Médio | Validar com Kimi Code primeiro; seguir especificação MCP |
| Vault crescendo indefinidamente | Médio | Rotina de garbage collection e arquivamento de sessões antigas |

## Deferred / Out of Scope

- UI web/desktop.
- Sync em nuvem.
- Transporte MCP HTTP/SSE.
- Multi-usuário.
