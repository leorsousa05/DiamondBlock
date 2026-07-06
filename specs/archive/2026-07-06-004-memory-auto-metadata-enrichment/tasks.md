# Tasks: Automatic Memory Metadata Enrichment

## Phase 1 — Domain model

- [x] Add `summary?: string` and `entities?: string[]` to `Memory`.
- [x] Add `summary?: string` and `entities?: string[]` to `MemoryInput`.
- [x] Update `updateMemory` to preserve existing `summary` and `entities`.

## Phase 2 — Enrichment port

- [x] Create `EnrichmentResult` interface.
- [x] Create `EnrichmentProvider` port interface.

## Phase 3 — Local enrichment adapter

- [x] Implement `LocalEnrichmentProvider` with:
  - Tokenization and stop-word filtering
  - Identifier extraction (camelCase / PascalCase)
  - Known technology term detection
  - Summary generation
  - Confidence scoring

## Phase 4 — Enrichment orchestration

- [x] Implement `MemoryEnrichmentService` with:
  - Provider-based extraction
  - Similar-memory tag inference via vector search
  - Tag merging, deduplication, and limits
  - Confidence threshold check
  - Persist updated memory

## Phase 5 — Use-case integration

- [x] Inject optional `MemoryEnrichmentService` into `SaveMemoryUseCase`.
- [x] Trigger enrichment asynchronously after save/index.
- [x] Inject optional `MemoryEnrichmentService` into `UpdateMemoryUseCase`.
- [x] Trigger enrichment asynchronously after save/index.

## Phase 6 — Serialization

- [x] Add `summary` and `entities` to `MemoryFrontmatter`.
- [x] Serialize the new fields when present.
- [x] Deserialize the new fields with safe defaults.

## Phase 7 — Container wiring

- [x] Instantiate `LocalEnrichmentProvider` in `container_factory.ts`.
- [x] Instantiate `MemoryEnrichmentService`.
- [x] Pass the service to `SaveMemoryUseCase` and `UpdateMemoryUseCase`.

## Phase 8 — Tests

- [x] Create `src/domain/services/memory_enrichment.test.ts`.
- [x] Create `src/infrastructure/local_enrichment_provider.test.ts`.
- [x] Update `src/application/use_cases/save_memory.test.ts`.
- [x] Update `src/application/use_cases/update_memory.test.ts`.
- [x] Add serializer round-trip tests.

## Phase 9 — Living docs & verification

- [x] Update `specs/living/diamondblock-core.md`.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Update `.spec.yaml` status to `completed`.
