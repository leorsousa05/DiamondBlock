# Tasks: DiamondBlock Core

## Phase 1 — Project Bootstrap

- [x] Criar `package.json` com scripts: `build`, `dev`, `test`, `cli`, `mcp`.
- [x] Configurar TypeScript (`tsconfig.json`) com path aliases.
- [x] Configurar vitest para testes unit/integração.
- [ ] Configurar linter/formatter (biome ou prettier + eslint). — deferred: não bloqueia MVP
- [x] Criar `.gitignore` e `README.md` inicial.

## Phase 2 — Domain & Ports

- [x] Implementar entidades `Memory`, `Session`, `UserProfile`, `ProjectProfile`.
- [ ] Implementar value objects `MemoryId`, `SessionId`, `Scope`. — deferred: IDs gerados inline por simplicidade
- [x] Definir ports: `MemoryRepository`, `SessionRepository`, `VectorIndex`, `EmbeddingProvider`, `ConfigStore`.
- [x] Implementar `ContextBuilder` e `Distiller` como domain services.

## Phase 3 — Infrastructure

- [x] Implementar `FileMemoryRepository` (Markdown + frontmatter).
- [x] Implementar `FileSessionRepository`.
- [x] Implementar `SqliteVectorIndex` (sqlite-vec).
- [x] Implementar `LocalEmbeddingProvider` (via `@xenova/transformers` + all-MiniLM-L6-v2).
- [x] Implementar `OpenAIEmbeddingProvider` (opcional).
- [x] Implementar `YamlConfigStore`.
- [x] Criar factory `createVault()` para inicialização do vault.

## Phase 4 — Application Use Cases

- [x] Implementar `GetContextUseCase`.
- [x] Implementar `SaveMemoryUseCase`.
- [x] Implementar `SearchMemoryUseCase`.
- [x] Implementar `UpdateMemoryUseCase`.
- [x] Implementar `DeleteMemoryUseCase`.
- [x] Implementar `LogSessionUseCase`.
- [x] Implementar `DistillSessionsUseCase`.

## Phase 5 — MCP Server

- [x] Criar `McpServer` com stdio transport.
- [x] Registrar tools: `get_context`, `search_memory`, `save_memory`, `update_memory`, `delete_memory`, `log_session`.
- [x] Mapear adapters para casos de uso.
- [x] Adicionar validação de schemas com zod.

## Phase 6 — CLI

- [x] Criar entrypoint CLI (`diamondblock`).
- [x] Comando `init`.
- [x] Comandos `memory list`, `memory search`, `memory add`, `memory show`, `memory edit`, `memory delete`.
- [x] Comandos `session list`, `session show`.
- [x] Comando `distill` com `--dry-run`.
- [x] Comando `status`.

## Phase 7 — Heartbeat & Maintenance

- [x] Implementar agendador de distilação periódica (`Heartbeat`).
- [ ] Adicionar garbage collection de sessões antigas. — deferred para próxima iteração
- [ ] Implementar consolidação de memórias duplicadas/contraditórias. — deferred para próxima iteração

## Phase 8 — Tests

- [x] Unit tests para domínio.
- [x] Integration tests para repositories e vector index.
- [ ] Contract tests para MCP tools. — parcial: testado manualmente via stdio
- [ ] E2E tests para CLI. — parcial: testado manualmente
- [ ] Smoke test com Kimi Code. — requer configuração do ambiente Kimi Code

## Phase 9 — Documentation & Release

- [ ] Documentar instalação e configuração no README.
- [ ] Criar arquivo de configuração MCP para Kimi Code.
- [ ] Publicar pacote npm (ou preparar para publicação).
- [x] Atualizar `specs/living/` com estado atual.
- [ ] Mover spec para `specs/archive/` quando completo. — aguardando review
