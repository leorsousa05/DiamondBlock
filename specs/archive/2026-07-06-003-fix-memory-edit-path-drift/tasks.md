# Tasks: Fix memory edit bug and id/path drift

## Phase 1 — Contracts

- [x] Add `resolvePath(memory: Memory): string` to `MemoryRepository` port.
- [x] Expose `resolvePath` as a public method in `FileMemoryRepository`.

## Phase 2 — Repository behavior

- [x] Update `FileMemoryRepository.save()` to delete the old file when the
  resolved path changes (type/scope move).
- [x] Fix `FileMemoryRepository.listAll()` id derivation to use frontmatter
  id, falling back to file basename.

## Phase 3 — Use cases

- [x] Update `SearchMemoryUseCase` to use `memoryRepository.resolvePath()`
  and remove the private `memoryPath()` helper.
- [x] Verify `UpdateMemoryUseCase` correctly delegates to `updateMemory()` and
  `save()`.

## Phase 4 — CLI

- [x] Rewrite `memory edit` to parse edited Markdown with
  `memoryFromMarkdown` and call `UpdateMemoryUseCase` with the original id.

## Phase 5 — Tests

- [x] Add repository tests for relocation, nested id resolution, and
  `resolvePath`.
- [x] Update `SearchMemoryUseCase` tests to cover path delegation.
- [x] Create `UpdateMemoryUseCase` tests for field updates and identity
  preservation.

## Phase 6 — Verification

- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Update `.spec.yaml` status to `implemented`.
