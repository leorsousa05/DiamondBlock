# Proposal: Codebase Indexer

## Motivation

Today, when a coding agent needs to understand a project, it relies on `get_context` (user/project/global memories + recent sessions) or on `search_memory` over manually curated memories. The agent has no direct, semantic access to the source code itself. It must either read files one by one or ask the user to summarize the codebase.

This creates three concrete problems:

1. **High token burn.** Agents read entire files repeatedly to answer localized questions.
2. **Incomplete context.** Agents may miss relevant files because they do not know the project structure.
3. **No offline semantic code search.** DiamondBlock already stores embeddings for memories; the same infrastructure can serve embeddings for code chunks.

A codebase indexer will scan project files, split them into chunks, generate embeddings, and store the chunks as project-scoped memories. The coding agent can then retrieve semantically relevant code snippets through the existing `get_context` and `search_memory` paths without reading the whole repository.

## Goals

- Add a `CodebaseScanner` port that discovers textual source files in a project directory while respecting `.gitignore` and configurable extension/size filters.
- Add a `CodeChunker` port that splits file contents into overlapping chunks suitable for embedding.
- Add a `CodebaseIndexRepository` port that persists a manifest of indexed files (path → content hash) so reindexing is incremental.
- Add an `IndexCodebaseUseCase` that orchestrates scan → chunk → embed → store, reusing the existing `MemoryRepository`, `VectorIndex`, and `EmbeddingProvider`.
- Store code chunks as `type: 'knowledge'`, `scope: 'project/<projectId>'`, with `source: 'codebase-indexer'` and tags that identify them as code (`['code', 'chunk', '<language>']`).
- Expose the indexer through the CLI (`dblock index [path]`) and the MCP server (`index_codebase` tool).
- Surface indexed code in `get_context` as a dedicated `code_context` section, so agents see relevant code without extra tool calls.
- Keep everything local-first and offline-capable.

## Non-Goals

- Parsing ASTs or producing language-aware chunks (functions/classes) in the first version. Line-based chunking is sufficient.
- Indexing binary files, images, or generated artifacts.
- Real-time file watching or continuous reindexing.
- Cross-project code search (chunks are scoped to one project).
- Replacing manual memories; code chunks are a new source of project knowledge, not a rewrite of the memory system.

## Constraints

- Must follow Clean Architecture / Ports & Adapters.
- Must reuse existing `MemoryRepository`, `VectorIndex`, and `EmbeddingProvider`.
- Must not introduce breaking changes to MCP/CLI contracts.
- Must remain deterministic and unit-testable.
- Must keep the vault layout predictable (`vault/CodebaseIndex/<projectId>.json` for the manifest).
