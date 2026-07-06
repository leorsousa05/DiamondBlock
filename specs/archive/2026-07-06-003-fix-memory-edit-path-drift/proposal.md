# Proposal: Fix memory edit bug and id/path drift

## Motivation

The `diamondblock memory edit <id>` command is currently broken in two ways:

1. **It creates a duplicate memory instead of updating the existing one.**
   The command reads the existing memory, opens it in an editor, strips the
   frontmatter, and then calls `SaveMemoryUseCase`. `SaveMemoryUseCase`
   always generates a new id and writes a new file. The old memory remains in
   place, so the user ends up with two memories and the printed id no longer
   matches the new file.

2. **Id and path handling are inconsistent across the codebase.**
   - `FileMemoryRepository.listAll()` derives ids by replacing directory
     separators with underscores, producing ids like `project_myproject_mem_abc`
     instead of the real id stored in the frontmatter.
   - `SearchMemoryUseCase` reconstructs a file path that does not match the
     actual `FileMemoryRepository` layout (it does not apply the special
     `project/` scope handling).

These bugs break the mental model that "a memory has a stable id" and make
search/list output unreliable.

## Goals

- Make `memory edit` update the same memory in place, preserving its id and
  `createdAt`.
- Allow the user to change any editable field through the editor: title,
  content, type, scope, and tags.
- When a memory changes type or scope, move its Markdown file to the new
  repository path and delete the stale file.
- Align path resolution so `search` and `list` show the same path that the
  repository uses.
- Fix id derivation so nested memories (e.g. project-scoped memories) keep
  their real id.

## Non-Goals

- Refactoring the whole CLI wiring or container setup.
- Changing the vector-index schema or embedding behavior.
- Adding linting, formatting, or unrelated dead-code cleanup.
- Replacing the existing `Math.random` id generator.

## Constraints

- Must remain compatible with existing vault files (frontmatter ids are
  already present).
- Must follow the project's Clean Architecture / Ports & Adapters structure.
- Must include unit tests for repository and use-case changes.
