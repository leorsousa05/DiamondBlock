# Scope & Project Resolution — Delta Spec

## Status

ADDED/MODIFIED — new capability; changes existing contracts without breaking backward compatibility.

## Summary

Introduce canonical scope normalization, automatic project resolution, and scope-aware vector search so that DiamondBlock consistently distinguishes global/user memories from project memories and surfaces the right context to agents.

## ADDED

- `src/domain/scope.ts` — `Scope` value object.
  - Normalization rules for scope strings.
  - Derivation of default scope from `MemoryType` and optional `projectId`.
  - Parsing helpers (`parse`, `isProject`, `projectIdFromScope`).

- `src/application/ports/project_resolver.ts` — `ProjectResolver` port.
  - `ProjectInfo` with `projectId` and `source` (`cwd` | `git` | `config` | `argument`).
  - `resolve(fromPath?)` returns detected project or `null`.

- `src/infrastructure/cwd_project_resolver.ts` — `CwdProjectResolver` adapter.
  - Detects project from explicit path, config `projectRoots`, git root, or directory name.

- `VectorSearchOptions` — `src/application/ports/vector_index.ts`.
  - Adds optional `scope` filter to vector search.

- `global_memory` — `src/application/use_cases/get_context.ts` and `src/domain/services/context_builder.ts`.
  - New output field that includes relevant global/knowledge memories.

- `scope` field — `SearchMemoryResult` (`src/application/use_cases/search_memory.ts`).
  - Returned in MCP and CLI search results.

- `--project` option — CLI memory and session commands.
  - Alias for `scope project/<id>` where applicable.
  - Triggers auto-detection when omitted.

- `projectRoots` field — `DiamondBlockConfig` (`src/application/ports/config_store.ts`).
  - Optional mapping of projectId to absolute path prefix for non-git projects.

## MODIFIED

- `src/application/ports/vector_index.ts`
  - `search(embedding, limit, options?)` signature extended.

- `src/infrastructure/sqlite_vector_index.ts`
  - Implements scope-aware search via JOIN with metadata table.

- `src/application/use_cases/search_memory.ts`
  - Passes scope to vector index.
  - Adds `scope` to result.
  - Removes in-memory post-filter (now done by index).

- `src/application/use_cases/save_memory.ts`
  - Normalizes scope before persistence.

- `src/application/use_cases/update_memory.ts`
  - Normalizes scope before persistence.

- `src/application/use_cases/get_context.ts`
  - Includes global memories.
  - Fixes user-memory filter to require `scope: 'user'`.

- `src/domain/services/context_builder.ts`
  - Adds `findGlobalMemories` dependency.
  - Adds `globalMemory` to output.

- `src/presentation/mcp/server.ts`
  - `search_memory` accepts optional `project_id` and returns `scope`.
  - `save_memory` accepts optional `project_id` and optional `scope`.
  - `update_memory` accepts optional `project_id`.
  - Logs resolved project/scope for observability.

- `src/presentation/cli/index.ts`
  - Adds `--project` support.
  - Shows `Scope` column in `memory search`.
  - Auto-detects project from cwd/git.

- `src/container.ts`
  - Adds `projectResolver` to `Container` interface.

- `src/container_factory.ts`
  - Instantiates and injects `CwdProjectResolver`.

- `src/infrastructure/yaml_config_store.ts`
  - Supports optional `projectRoots` config field.

- `specs/living/diamondblock-core.md`
  - Documents scope/project resolution behavior.

## REMOVED

- Nothing.

## Backward Compatibility

- Existing memories with arbitrary scopes remain readable and searchable.
- MCP/CLI contracts are additive: new fields/options are optional.
- Vector index `search()` accepts an optional third argument; existing call sites compile without changes.
- Scope normalization applies on write only when an explicit normalized scope is not provided.
