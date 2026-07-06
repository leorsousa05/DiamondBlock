# Memory System — Spec Delta

## Summary

Fix the CLI `memory edit` flow so it performs a true update, and remove
id/path drift between the file repository, the search use case, and the
serializer.

## ADDED

- `MemoryRepository.resolvePath(memory: Memory): string`
  - Read-model query that returns the persistence location for a memory.
  - Implemented by `FileMemoryRepository` using the same layout logic as
    `save()`.

## MODIFIED

- `src/application/ports/memory_repository.ts`
  - Add `resolvePath(memory: Memory): string` to the `MemoryRepository`
    interface.

- `src/infrastructure/file_memory_repository.ts`
  - Implement `resolvePath()` as a public method.
  - Update `save()` to detect an existing file with the same id and delete it
    when the new path differs (type/scope change).
  - Fix `listAll()` id derivation to use the frontmatter id when present,
    falling back to the Markdown file basename (without `.md`).

- `src/application/use_cases/search_memory.ts`
  - Replace the private `memoryPath()` helper with
    `this.memoryRepository.resolvePath(memory)`.
  - Keep `SearchMemoryResult` shape unchanged for MCP compatibility.

- `src/presentation/cli/index.ts`
  - Rewrite the `memory edit` action:
    1. Load the existing memory by id.
    2. Open `memoryToMarkdown(memory)` in the editor.
    3. Parse the edited text with `memoryFromMarkdown(originalId, updated)`.
    4. Call `UpdateMemoryUseCase` with the original id and all parsed fields
       (title, content, type, scope, tags). Ignore any id change in the
       frontmatter to preserve identity.

- `src/application/use_cases/update_memory.ts`
  - No signature change. Confirm it passes the merged memory to
    `memoryRepository.save()`, which will now relocate the file when needed.

- `src/infrastructure/markdown_serializer.ts`
  - No behavior change; relied upon for round-trip parsing in the editor.

## REMOVED

- `SearchMemoryUseCase.memoryPath()` private helper.

## Affected Tests

- `src/infrastructure/file_memory_repository.test.ts`
  - Add tests for file relocation on type/scope change.
  - Add tests for correct id resolution of nested (project-scoped) memories.
  - Add tests for `resolvePath()`.

- `src/application/use_cases/search_memory.test.ts`
  - Update fake repository to implement `resolvePath()`.
  - Assert that search results use the repository-provided path.

- `src/application/use_cases/update_memory.test.ts` (new)
  - Add tests for updating title, content, type, scope, and tags.
  - Add tests that the id and `createdAt` are preserved.
