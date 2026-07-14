---
created_at: 2026-07-08
updated_at: 2026-07-09
project_name: ai-native-codebase-indexer
status: active
---

# Long-Term Plan: AI-Native Codebase Indexer

## Vision

Transformar o DiamondBlock em um indexador de codebase inteligente e local-first, capaz de representar projetos como um grafo de conhecimento enriquecido por embeddings, fornecendo contexto preciso para agentes de IA em tarefas de implementação, debugging, refatoração e arquitetura.

## Goals

- Construir um motor de parsing genérico e extensível para indexação de codebase.
- Substituir o chunking por linhas por uma estratégia de parsing em cascata (AST → parser simplificado → chunking inteligente).
- Suportar incrementalmente as principais linguagens de backend, frontend, mobile e infraestrutura como adapters plugáveis.
- Construir um grafo de conhecimento com relações entre símbolos (calls, imports, extends, implements).
- Oferecer retrieval híbrido: vetorial + estrutural + metadados.
- Manter o sistema 100% local-first e funcional sem IA generativa.
- Expor ferramentas MCP especializadas para agentes (find_symbol, find_references, impact_analysis, etc.).
- Garantir que arquivos sem suporte de AST sejam indexados com fallback e metadados de confiança.

## Scope

### In scope

- Motor genérico de parsing com contrato `CodeParser` e registro de parsers por linguagem.
- Estratégia de parsing em cascata: AST → parser simplificado → chunking inteligente.
- Metadados de confiança (`parsingMode`, `confidence`, `supportsGraph`, `supportsSymbols`).
- Chunk builder semântico genérico que consome `ParsingResult`.
- Parsing AST para TS/JS e Python nas primeiras fases.
- Suporte progressivo a: Go, Rust, PHP, Java, Kotlin, C, C++, C#, Swift, Ruby, Dart e outras linguagens comuns.
- Parser simplificado (regex/heurísticas) para linguagens sem parser AST completo.
- Chunking inteligente como fallback final para arquivos sem AST nem parser simplificado.
- Extração de símbolos (classes, funções, métodos, componentes, hooks, interfaces).
- Construção de grafo de conhecimento leve e consultável.
- Múltiplos índices (vector, symbol, module, dependency).
- Retrieval híbrido com expansão de contexto.
- Cache de sessão e intenção de busca.
- Integração contínua com CLI e MCP do DiamondBlock.

### Out of scope

- Substituir IDEs ou ferramentas de análise estática enterprise.
- Suporte a linguagens legadas ou muito de nicho na primeira fase (ex: COBOL, Fortran, Assembly, Perl legado).
- Análise dinâmica ou execução de código.
- Integração obrigatória com serviços de IA generativa externos.

## Parsing Strategy (Cascata)

Para cada arquivo, o indexador deve tentar, em ordem:

1. **Parser AST completo**
   - Quando disponível para a linguagem.
   - Produz chunks semânticos, símbolos e relações.
   - `parsingMode: "ast"`, `confidence: 0.95`, `supportsGraph: true`, `supportsSymbols: true`.

2. **Parser simplificado**
   - Regex/heurísticas para extrair imports, exports, funções, classes básicas.
   - Útil para linguagens sem parser AST integrado ainda.
   - `parsingMode: "simplified"`, `confidence: 0.65`, `supportsGraph: false`, `supportsSymbols: true`.

3. **Chunking inteligente**
   - Fallback final para arquivos de configuração, scripts, documentação, logs, etc.
   - Detecta delimitadores naturais:
     - Linhas em branco
     - Comentários de bloco
     - Region markers (`#region`, `// MARK`, etc.)
     - Markdown headings
     - Blocos YAML/JSON
     - Seções de configuração
   - Se não encontrar delimitadores, divide por tamanho (200–400 linhas com overlap de 20–30 linhas).
   - `parsingMode: "fallback"`, `confidence: 0.35`, `supportsGraph: false`, `supportsSymbols: false`.

## Linguagens Planejadas

| Linguagem | Fase | Parser Alvo |
|-----------|------|-------------|
| TypeScript / JavaScript | 1 | typescript compiler API / babel / swc |
| Python | 2 | tree-sitter-python / ast |
| Go | 3 | tree-sitter-go |
| Rust | 3 | tree-sitter-rust |
| PHP | 3 | tree-sitter-php |
| Java | 4 | tree-sitter-java / javaparser |
| Kotlin | 4 | tree-sitter-kotlin |
| C / C++ | 5 | tree-sitter-c / tree-sitter-cpp |
| C# | 5 | tree-sitter-c-sharp |
| Swift | 5 | tree-sitter-swift |
| Ruby | 5 | tree-sitter-ruby |
| Dart | 6 | tree-sitter-dart |
| Outras | 7+ | Parser simplificado ou fallback |

## Milestones

1. **Milestone 1 — Motor de Parsing em Cascata + Chunk Builder Semântico Genérico + TS/JS ✅**
   - Target: 2026-07-22
   - Status: concluído em 2026-07-09
   - Acceptance criteria:
     - Definir contratos `CodeParser`, `ParsingResult`, `Symbol`, `ChunkMetadata`.
     - Implementar registro de parsers por linguagem (`ParserRegistry`).
     - Implementar chunk builder semântico genérico que consome `ParsingResult`.
     - Implementar chunking inteligente como fallback.
     - Implementar parser AST para TS/JS como primeiro adapter.
     - Integrar estratégia de cascata ao indexer existente.
     - Testes cobrindo motor genérico, TS/JS, arquivos de configuração e fallback.

2. **Milestone 2 — Parser Simplificado Genérico + Python**
   - Target: 2026-08-05
   - Acceptance criteria:
     - Parser simplificado genérico baseado em regex/heurísticas.
     - Parser AST para Python (funções, classes, métodos).
     - Registro de Python como adapter no motor.
     - Metadados de confiança aplicados a todos os chunks.

3. **Milestone 3 — Extração de Símbolos e Relações para TS/JS e Python**
   - Target: 2026-08-19
   - Acceptance criteria:
     - Extração de classes, interfaces, funções, métodos, componentes e hooks.
     - Relações: imports/exports, calls, extends, implements.
     - Símbolos armazenados como memórias com tags e metadados.
     - Ferramenta MCP `find_symbol` funcional.

4. **Milestone 4 — Knowledge Graph Leve**
   - Target: 2026-09-02
   - Acceptance criteria:
     - Grafo de símbolos persistido localmente (SQLite ou JSONL).
     - APIs para graph traversal: find_callers, find_callees, find_implementations.
     - Integração do grafo no context builder para expansão de contexto.

5. **Milestone 5 — Adapters: Go, Rust e PHP**
   - Target: 2026-09-16
   - Acceptance criteria:
     - Parsers AST ou simplificados para Go, Rust e PHP.
     - Registro no motor genérico.
     - Extração de símbolos básicos para cada linguagem.

6. **Milestone 6 — Adapters: Java, Kotlin, C, C++, C#, Swift e Ruby**
   - Target: 2026-09-30
   - Acceptance criteria:
     - Parsers AST ou simplificados para cada linguagem.
     - Registro no motor genérico.
     - Suporte a classes, interfaces, herança, anotações/decoradores onde aplicável.

7. **Milestone 7 — Retrieval Híbrido e Intenção de Busca**
   - Target: 2026-10-14
   - Acceptance criteria:
     - Combinação de busca vetorial, exata por símbolo, filtros de metadados e graph traversal.
     - Reranking simples dos resultados.
     - Modos de busca adaptados à intenção: debug, implementação, refatoração, arquitetura, documentação.

8. **Milestone 8 — Cache de Sessão e Ferramentas MCP Avançadas**
   - Target: 2026-10-28
   - Acceptance criteria:
     - Cache de símbolos, arquivos e contexto expandido durante uma sessão.
     - Ferramentas MCP: find_references, impact_analysis, summarize_module, summarize_symbol.
     - Contexto expandido automático no `get_context`.

## Constraints

- Manter 100% local-first; evitar serviços externos obrigatórios.
- Preservar compatibilidade com armazenamento existente (Markdown + sqlite-vec).
- Embeddings continuam locais via `@xenova/transformers` ou equivalente, com opção de modelos de código.
- Cada milestone deve ser entregue, testado e commitado independentemente.
- Arquivos sem parser AST devem sempre ter fallback funcional, nunca serem ignorados.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parsers AST adicionarem dependências pesadas | medium | medium | Avaliar bibliotecas leves (typescript compiler API, babel, tree-sitter) por linguagem |
| Performance ruim em repos grandes | medium | high | Manter incrementalidade, cache e possibilitar indexação parcial |
| Qualidade dos embeddings locais insuficiente para código | medium | medium | Permitir modelos de código opcionais e retrieval híbrido |
| Complexidade do grafo crescer demais | medium | medium | Começar com relações simples e expandir gradualmente |
| Parsers AST pesados ou difíceis de instalar | medium | medium | Usar bibliotecas leves por linguagem; fallback sempre disponível |
| Arquivos sem suporte serem subindexados | low | medium | Estratégia de fallback garante cobertura; metadados indicam confiança |
