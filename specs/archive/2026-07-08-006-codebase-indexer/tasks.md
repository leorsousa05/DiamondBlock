# Tasks: Codebase Indexer

## Phase 1 — Domain value object

- [ ] Create `src/domain/code_chunk.ts` with `CodeChunk`, `CodeChunkInput`, `createCodeChunk`, `codeChunkToMemory`.
- [ ] Ensure deterministic chunk id based on file path and start line.
- [ ] Create `src/domain/code_chunk.test.ts` covering id determinism and memory conversion.

## Phase 2 — Ports

- [ ] Create `src/application/ports/codebase_scanner.ts` with `SourceFile`, `CodebaseScannerOptions`, `CodebaseScanner`.
- [ ] Create `src/application/ports/code_chunker.ts` with `CodeChunkerOptions`, `CodeChunker`.
- [ ] Create `src/application/ports/codebase_index_repository.ts` with `FileIndexEntry`, `CodebaseIndexManifest`, `CodebaseIndexRepository`.

## Phase 3 — Infrastructure adapters

- [x] Create `src/infrastructure/file_codebase_scanner.ts`.
  - [x] Walk project directory recursively.
  - [x] Parse `.gitignore` with simple rules.
  - [x] Apply default extension allow-list and max file size.
  - [x] Skip common build/vendor directories.
  - [x] **Expanded default extensions:** TSX, JSX, MTS, CTS, XML, XSD, XSL, XSLT, JSP, JSPX, MDX, Vue, Svelte, Astro, ERB, PHTML, PL, PM, BAT, CMD, INI, CFG, CONF, CONFIG, ENV, PROPERTIES, FSL, FSX, VB, M, MM, HTM, XHTML, SASS, LESS, JSONC, JSON5, plus special files (`.eslintrc`, `.prettierrc`, `.babelrc`, `.editorconfig`, `.gitignore`, `Makefile`, `Rakefile`, `Gemfile`).
- [x] Create `src/infrastructure/file_codebase_scanner.test.ts`.
- [ ] Create `src/infrastructure/line_code_chunker.ts`.
  - [ ] Configurable `chunkSizeLines` and `overlapLines`.
  - [ ] Prefix each chunk with file path and line range.
  - [ ] Detect language from file extension.
- [ ] Create `src/infrastructure/line_code_chunker.test.ts`.
- [ ] Create `src/infrastructure/file_codebase_index_repository.ts`.
  - [ ] Persist manifest to `vault/CodebaseIndex/<projectId>.json`.
  - [ ] Load returns `null` when manifest is missing.
  - [ ] Delete removes manifest file.
- [ ] Create `src/infrastructure/file_codebase_index_repository.test.ts`.
- [ ] Create `src/infrastructure/codebase_indexer.ts`.
  - [ ] Compute SHA-256 content hashes.
  - [ ] Classify files as added/updated/removed/unchanged.
  - [ ] Chunk and persist added/updated files.
  - [ ] Delete old memories and vectors for removed/updated files.
  - [ ] Update manifest unless `dryRun`.
  - [ ] Support `force` mode.
- [ ] Create `src/infrastructure/codebase_indexer.test.ts`.

## Phase 4 — Application use case

- [ ] Create `src/application/use_cases/index_codebase.ts`.
  - [ ] Resolve projectId via `ProjectResolver` when not provided.
  - [ ] Resolve root path (default cwd).
  - [ ] Delegate to `CodebaseIndexer`.
  - [ ] Return statistics.
- [ ] Create `src/application/use_cases/index_codebase.test.ts`.

## Phase 5 — Context integration

- [ ] Modify `src/domain/services/context_builder.ts`.
  - [ ] Add `findCodeMemories` dependency.
  - [ ] Add `codeContext` to `ContextOutput`.
  - [ ] Format code snippets with file path and line range.
- [ ] Update `src/domain/services/context_builder.test.ts`.
- [ ] Modify `src/application/use_cases/get_context.ts`.
  - [ ] Implement `findCodeMemories` using scope + source filter + semantic search.
  - [ ] Return `code_context`.
- [ ] Update `src/application/use_cases/get_context.test.ts`.

## Phase 6 — Container wiring

- [ ] Modify `src/container_factory.ts`.
  - [ ] Instantiate scanner, chunker, index repository, and indexer.
  - [ ] Add fields to `Container` interface in `src/container.ts`.

## Phase 7 — CLI

- [ ] Add `index [path]` command to `src/presentation/cli/index.ts`.
  - [ ] `--project <projectId>` override.
  - [ ] `--force` reindex all.
  - [ ] `--dry-run` preview changes.
  - [ ] `--status` show manifest summary.
- [ ] Display spinner and result summary.
- [ ] Show staged progress feedback: files found, file X/Y, chunks per file, saving manifest.

## Phase 8 — MCP server

- [ ] Add `index_codebase` tool to `src/presentation/mcp/server.ts`.
  - [ ] Inputs: `project_id?`, `path?`, `force?`, `dry_run?`.
  - [ ] Output statistics.
- [ ] Update `get_context` response schema to include `code_context`.
- [ ] Update `src/presentation/mcp/server.test.ts`.

## Phase 9 — Living docs & verification

- [x] Update `specs/living/diamondblock-core.md` with codebase indexer behavior and expanded extension list.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Update `.spec.yaml` status to `completed`.
