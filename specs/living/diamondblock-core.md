# Living Spec: DiamondBlock Core

Esta especificação reflete o estado implementado do DiamondBlock.

## Visão

DiamondBlock é um servidor MCP de memória persistente, semântica e auto-curada para coding agents, com CLI rica para humanos.

## Componentes Implementados

- **Memory System**: armazena memórias de usuário, projeto, conhecimento e destiladas em Markdown + frontmatter.
- **Vector Index**: índice vetorial local SQLite (`sqlite-vec`) para busca semântica, agora com filtro por escopo no próprio índice.
- **Metadata Enrichment**: enriquecimento assíncrono e local de memórias com tags, entidades e resumo, usando regras heurísticas e busca por similaridade.
- **MCP Server**: expõe tools via stdio para agents, com resolução automática de `project_id` e exibição de `scope` nos resultados.
- **CLI**: interface humana para gerenciar memórias e sessões, com opção `--project` e detecção automática de projeto a partir do cwd/git/config.
- **Distiller**: destila logs de sessão em memórias curadas.
- **Scope & Project Resolution**: value object `Scope`, port `ProjectResolver` e adapter `CwdProjectResolver` para normalizar e resolver escopos e projetos.

## Stack

- Node.js / TypeScript
- `@modelcontextprotocol/sdk` para MCP
- `@xenova/transformers` para embeddings locais
- `sqlite-vec` + `better-sqlite3` para índice vetorial
- `commander`, `chalk`, `cli-table3`, `ora` para CLI
- `vitest` para testes

## Decisões Arquiteturais

- Modular Monolith com Clean Architecture.
- Repository + Strategy patterns.
- Markdown como fonte da verdade.
- 100% local-first, privado por padrão.

## Status

Implementação inicial completa e testada. Enriquecimento automático de metadados implementado (spec 004). Resolução de escopo e projeto implementada (spec 005): `Scope`, `ProjectResolver`, busca vetorial scope-aware, `--project` na CLI e `project_id` opcional no MCP.

## Deferred

- Garbage collection de sessões antigas.
- Consolidação de memórias duplicadas/contraditórias.
- Publicação npm.
- UI web/desktop.
- Transporte MCP HTTP/SSE.
- Sync em nuvem.
- Multi-usuário.
- Mapeamento explícito de múltiplos projetos no vault (`projectRoots` já suporta caminho -> projectId).
