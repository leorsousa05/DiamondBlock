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
- **Codebase Indexer**: escaneia arquivos de código de um projeto (extensões expandidas incluem TSX, JSX, XML, JSP, Vue, Svelte, Astro, MDX, Python, e arquivos especiais como `.eslintrc`, `.gitignore`, `Makefile`), processa através de um pipeline de parsing semântico (`ParsingPipeline`) com suporte AST para TypeScript/JavaScript e Python, parser simplificado genérico (`SimplifiedParser`) com padrões configuráveis por linguagem, e chunking inteligente de fallback para outras linguagens. Gera embeddings e armazena os chunks em repositório próprio (`CodebaseChunkRepository`) sob `vault/CodebaseChunks/<projectId>/`, separado das memórias do usuário. O manifesto do índice (`CodebaseIndexRepository`) referencia `chunkIds`. A busca vetorial continua compartilhando o banco `sqlite-vec` através da abstração `VectorIndexable`. Integra-se ao `get_context` via seção `code_context` e é acessível pelo CLI (`dblock index run/list/search/status/purge/clean-orphans`) e pelo MCP (`index_codebase`). Migração automática de manifests legados que usavam `memoryIds`. O pipeline foi otimizado (spec 013) para realizar processamento em lote, agrupando salvamento de chunks (`saveAll`), geração de embeddings (`embedBatch`) e escrita vetorial no SQLite (`indexBatch` em uma única transação), reduzindo drasticamente os timeouts e operações em disco.

- **Scope & Project Resolution**: value object `Scope`, port `ProjectResolver` e adapter `CwdProjectResolver` para normalizar e resolver escopos e projetos.
- **Web UI (Presentation Layer)**: Interface web em React/Vite que expõe todas as funcionalidades humanas do DiamondBlock (Vault status, CRUD de memórias com renderização de Markdown, visualização de sessões estilo chat, gerenciador de indexador de código com progresso SSE em tempo real, distilador de sessões e instalador MCP). Servida via Fastify direto do CLI (`dblock web` na porta 3847).

## Stack

- Node.js / TypeScript
- `@modelcontextprotocol/sdk` para MCP
- `@xenova/transformers` para embeddings locais
- `sqlite-vec` + `better-sqlite3` para índice vetorial
- `commander`, `chalk`, `cli-table3`, `ora` para CLI
- `fastify`, `@fastify/cors`, `@fastify/static` para o Web Server
- React 18, Vite, React Router, React Markdown para o frontend da Web UI
- `vitest` para testes

## Decisões Arquiteturais

- Modular Monolith com Clean Architecture.
- Repository + Strategy patterns.
- Markdown como fonte da verdade.
- 100% local-first, privado por padrão.
- Presentation Layer modular: comandos CLI, servidor MCP stdio e agora Web HTTP API + SPA estático servido pelo mesmo processo.

## Status

Implementação inicial completa e testada. Enriquecimento automático de metadados implementado (spec 004). Resolução de escopo e projeto implementada (spec 005): `Scope`, `ProjectResolver`, busca vetorial scope-aware, `--project` na CLI e `project_id` opcional no MCP. Indexador de codebase implementado (spec 006): scanner com `.gitignore`, chunker por linhas, repositório de manifesto, orquestrador incremental, `code_context` em `get_context`, comando `dblock index` e tool MCP `index_codebase`. Motor de parsing semântico genérico com AST chunking para TypeScript/JavaScript implementado (spec 007). Separação do índice de codebase do sistema de memórias implementada (spec 008). Interface Web UI e comando `dblock web` implementados (spec 009): Fastify REST API, SSE streaming para progresso em tempo real de index/distill, React single page app e build integrado no npm scripts. Parser simplificado genérico e adapter Python com `tree-sitter` implementados (spec 011): arquivos `.py` são indexados com `parsingMode` AST ou simplified, e o parser heuristico é extensível a novas linguagens via `LanguagePatternSet`. Otimização de indexação em lote (spec 013) implementada para reduzir operações em disco de $O(N^2)$ para $O(1)$ e possibilitar inferência em lote de embeddings.

## Deferred

- Garbage collection de sessões antigas.
- Consolidação de memórias duplicadas/contraditórias.
- Publicação npm.
- Transporte MCP HTTP/SSE.
- Sync em nuvem.
- Multi-usuário.
- Mapeamento explícito de múltiplos projetos no vault (`projectRoots` já suporta caminho -> projectId).
- Adapters de parser para outras linguagens além de TypeScript/JavaScript e Python (Go, Rust, Java, PHP, etc.).
- Relações entre símbolos e knowledge graph.
- MCP tools para busca de símbolos (`findSymbol`, `findReferences`, etc.).
- File watching / reindexação contínua.
- Busca de código cross-project.
