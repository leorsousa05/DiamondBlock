# Tasks: Fix memory scope resolution when --project is passed to CLI add

## Bug Description

When running:

```bash
dblock memory add --project diamondblock --title Hello!
```

The CLI saves the memory with scope `global` instead of `project/diamondblock`. This happens because the default memory type is `knowledge`, and `Scope.fromTypeAndProject('knowledge', projectId)` always returns `global`, ignoring the supplied `projectId`.

As a result, `dblock memory list` (which filters by the detected project scope) does not show the newly created memory.

## Expected Behavior

Passing `--project <projectId>` to `dblock memory add` should create a memory scoped to that project when `--type` is not explicitly provided.

## Root Cause

In `src/presentation/cli/index.ts`, the `memory add` command defines `--type` with a default of `'knowledge'`. When `--project` is supplied, the command still uses `knowledge` and calls `Scope.fromTypeAndProject('knowledge', projectId)`, which returns `global`.

## Fix

- Change the `memory add` command so that when `--project` is provided and `--type` is not explicitly set, the effective type defaults to `project` instead of `knowledge`.
- Keep backward compatibility: if the user explicitly passes `--type`, respect that choice (existing use-case validation will reject incompatible combinations such as `--type knowledge --project diamondblock`).
- Add unit tests for the CLI command parsing / scope resolution behavior.

## Tasks

- [x] Update `src/presentation/cli/index.ts` `memory add` logic to default type to `project` when `--project` is provided and `--type` is omitted.
- [x] Ensure help text remains accurate.
- [x] Add `src/presentation/cli/index.test.ts` covering:
  - [x] `memory add --project <id> --title <title>` creates a `project/<id>` scope.
  - [x] `memory add --title <title>` (no project) still defaults to `global` scope.
  - [x] `memory add --type user --title <title>` still creates `user` scope.
  - [x] `memory add --type project --project <id> --title <title>` creates `project/<id>` scope.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [x] Update `.spec.yaml` status to completed.

## Affected Files

- `src/presentation/cli/index.ts`
- `src/presentation/cli/index.test.ts` (new)
- `src/domain/scope.ts` (if helper changes are needed)
