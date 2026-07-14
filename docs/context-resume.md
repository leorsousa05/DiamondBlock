---
created_at: 2026-07-08
updated_at: 2026-07-09
project_name: ai-native-codebase-indexer
---

# Context Resume: AI-Native Codebase Indexer

## Project Summary

O DiamondBlock possui uma v1 funcional de codebase indexer que descobre arquivos, divide em chunks por linhas, gera embeddings locais e expõe via CLI e MCP. A visão de longo prazo é evoluir para um indexer semântico multi-linguagem baseado em AST, com grafo de conhecimento e retrieval híbrido, mantendo-se local-first.

## Current Phase

Milestone 1 concluído e entregue em `main`. O sistema já conta com motor genérico de parsing em cascata, adapter AST para TypeScript/JavaScript, chunk builder semântico, chunking inteligente de fallback, separação do índice de codebase do sistema de memórias, e uma Web UI completa servida pelo comando `dblock web`. O próximo passo é o Milestone 2: parser simplificado genérico + adapter Python.

## Last Session Highlights

- As specs 007–010 foram implementadas, revisadas e enviadas para `main`.
- O motor de parsing em cascata (`ParsingPipeline`, `ParserRegistry`, `TypeScriptParser`, `SmartFallbackChunker`, `SemanticChunkBuilderImpl`) foi integrado ao indexer existente.
- Os chunks de codebase passaram a ser armazenados em repositório próprio (`CodebaseChunkRepository`), desacoplando-os das memórias do usuário.
- Manifestos legados com `memoryIds` são migrados automaticamente para `chunkIds`.
- A CLI ganhou subcomandos de índice (`run`, `status`, `search`, `purge`, `clean-orphans`) e o comando `dblock web`.
- A Web UI foi construída com Fastify no backend e React/Vite no frontend, com REST API + SSE para progresso em tempo real.
- O pacote foi versionado para `0.5.0`.

## Open Questions

- Qual biblioteca de parsing usar para Python? (tree-sitter-python, stdlib `ast` via python-bridge, ou outra)
- Como estruturar o parser simplificado genérico para que seja extensível a múltiplas linguagens sem AST completo?
- Quais metadados de símbolos devem ser persistidos no `CodebaseChunk` para suportar futura extração de relações?
- Como garantir que o parser simplificado respeite a mesma interface `CodeParser` do adapter AST?

## Next Actions

1. Atualizar `updated_at` em todos os artefatos de longo prazo após revisão.
2. Criar spec técnica para Milestone 2 via Architect.
3. Escolher biblioteca de parsing para Python.
4. Implementar parser simplificado genérico baseado em regex/heurísticas.
5. Implementar adapter Python e registrá-lo no `ParserRegistry`.
6. Aplicar metadados de confiança (`parsingMode`, `confidence`) a todos os chunks gerados.
