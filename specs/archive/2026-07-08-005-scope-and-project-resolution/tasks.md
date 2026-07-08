# Tasks: Improve Scope and Project Resolution

## Phase 1 — Domain scope helper

- [x] Create `src/domain/scope.ts` with `Scope` value object.
- [x] Implement `Scope.normalize(scope)`.
- [x] Implement `Scope.fromTypeAndProject(type, projectId?)`.
- [x] Implement `Scope.parse(scope)`, `Scope.isProject(scope)`, `Scope.projectIdFromScope(scope)`.
- [x] Create `src/domain/scope.test.ts` with normalization, parsing, and derivation cases.

## Phase 2 — Project resolver port and adapter

- [x] Create `src/application/ports/project_resolver.ts` with `ProjectInfo` and `ProjectResolver`.
- [x] Create `src/infrastructure/cwd_project_resolver.ts`.
- [x] Implement resolution precedence: explicit path → config mappings → git root → directory name.
- [x] Add safe git execution with timeout and error fallback.
- [x] Create `src/infrastructure/cwd_project_resolver.test.ts`.

## Phase 3 — Scope-aware vector index

- [x] Modify `src/application/ports/vector_index.ts` to add `VectorSearchOptions`.
- [x] Update `VectorIndex.search` signature to accept `options?: VectorSearchOptions`.
- [x] Modify `src/infrastructure/sqlite_vector_index.ts` to JOIN `vec_memories` with `memories` when scope is provided.
- [x] Ensure metadata row is inserted before vector row during `index()`.
- [x] Update `src/infrastructure/sqlite_vector_index.test.ts` with scope-filtered search cases.

## Phase 4 — Use case updates

- [x] Modify `SaveMemoryUseCase` to normalize scope before creating the memory.
- [x] Modify `UpdateMemoryUseCase` to normalize scope before updating the memory.
- [x] Modify `SearchMemoryUseCase` to pass scope to vector index and include scope in results.
- [x] Remove post-filter scope logic from `SearchMemoryUseCase` (handled by index).
- [x] Modify `GetContextUseCase` to include global memories and fix user-memory filter.
- [x] Modify `ContextBuilder` to add `findGlobalMemories` dependency and `globalMemory` output.
- [x] Update use-case tests.

## Phase 5 — Container wiring

- [x] Update `src/container.ts` to include `projectResolver`.
- [x] Update `src/container_factory.ts` to instantiate `CwdProjectResolver` and inject it.
- [x] Ensure MCP server and CLI receive the same container.

## Phase 6 — MCP server

- [x] Update `search_memory` schema to accept optional `project_id` and return `scope`.
- [x] Update `save_memory` schema to accept optional `project_id` and optional `scope`.
- [x] Update `update_memory` schema to accept optional `project_id`.
- [x] Resolve `scope` from `project_id` when scope is omitted.
- [x] Add debug logging of resolved `project_id` / `scope`.

## Phase 7 — CLI

- [x] Add `--project` option to memory and session commands.
- [x] Implement automatic project resolution from cwd/git when `--project` is omitted.
- [x] Update `memory search` output to include `Scope` column.
- [x] Update `memory list` to support `--project` alias.
- [x] Update `session list` to support `--project` filter.
- [x] Show detected project in verbose/debug output.

## Phase 8 — Tests

- [x] `src/domain/scope.test.ts` passes.
- [x] `src/infrastructure/cwd_project_resolver.test.ts` passes.
- [x] `src/infrastructure/sqlite_vector_index.test.ts` passes.
- [x] `src/application/use_cases/search_memory.test.ts` passes.
- [x] `src/application/use_cases/get_context.test.ts` passes.
- [x] `src/application/use_cases/save_memory.test.ts` passes.
- [x] `src/application/use_cases/update_memory.test.ts` passes.
- [x] `src/presentation/mcp/server.test.ts` passes.
- [x] All existing tests continue to pass.

## Phase 9 — Living docs & verification

- [x] Update `specs/living/diamondblock-core.md` with scope/project resolution behavior.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Update `.spec.yaml` status to `completed`.
