# Proposal: Improve Scope and Project Resolution

## Motivation

DiamondBlock stores memories with a `type` (user, project, knowledge, distilled) and a free-form `scope`. Sessions are tagged with a `projectId`. In practice, callers cannot tell which scope is being used, and the system does not consistently distinguish:

- **Global / user memories** from **project memories**.
- **Sessions from different projects** when listing via CLI.
- **Which project is "current"** when no explicit `project_id` or `scope` is supplied.

This leads to four concrete problems observed by users:

1. **Silent under-fetch in semantic search.** `SearchMemoryUseCase` asks the vector index for `limit * 2` candidates and then filters by scope in application code. If the top-ranked vectors belong to other scopes, in-scope memories that exist further down the ranking are silently dropped, and the caller receives fewer results than expected.
2. **No automatic project detection.** Neither the MCP server nor the CLI inspects `cwd`, git root, or vault configuration to infer a project. Callers must always pass explicit strings, and a mismatch like `project_id: "my-project"` vs `scope: "project/my-project"` produces empty results with no warning.
3. **Global knowledge is excluded from agent context.** `GetContextUseCase` only returns `type: 'user'` and `type: 'project'` memories scoped to the project. General knowledge memories (`type: 'knowledge'`, `scope: 'global'`) are never surfaced to the agent, even though they are likely relevant.
4. **Poor observability of scope.** MCP `search_memory` results do not include `scope`. CLI `memory search` does not show a `Scope` column. There is no debug logging that reveals the resolved `project_id` or `scope`.

This change makes scope and project handling explicit, normalized, observable, and context-aware.

## Goals

- Introduce a canonical `Scope` value object and normalization rules so that `type` and `scope` are always consistent.
- Add a `ProjectResolver` port that can infer the current `project_id` from `cwd`, git repository root, or explicit override.
- Make `VectorIndex.search` scope-aware so that scope filtering happens inside the vector query, preventing under-fetch.
- Update `GetContextUseCase` to include global/user knowledge memories alongside project memories while keeping the result compact.
- Return `scope` in MCP and CLI search results so users can see where each memory belongs.
- Add `--project` support to CLI memory and session commands, with automatic cwd/git detection when omitted.
- Preserve backward compatibility with existing memories that may have arbitrary scopes.

## Non-Goals

- Multi-user or remote project resolution.
- Changing the Markdown file layout (memories stay flat in `vault/Memory/` for now).
- Deduplication or merging of memories across scopes.
- Web UI or desktop UI for project management.
- Cloud-based project detection.

## Constraints

- Must remain 100% local-first and offline-capable.
- Must follow Clean Architecture / Ports & Adapters.
- Must not break existing MCP/CLI contracts; additions must be backward-compatible.
- Must keep existing vault files readable.
- Must be deterministic and unit-testable.
