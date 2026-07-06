# Memory System — Spec Delta

## Summary

Introduce automatic, asynchronous metadata enrichment for memories. The
enrichment generates tags, a summary, and entities using a local, hybrid
strategy and persists the results in the memory Markdown frontmatter.

## ADDED

- `EnrichmentProvider` port
  - Contract for generating metadata from a memory.
  - Returns `EnrichmentResult` with `tags`, `summary`, `entities`, and
    `confidence`.

- `MemoryEnrichmentService` domain service
  - Orchestrates enrichment:
    1. Invoke the `EnrichmentProvider` to generate candidate metadata.
    2. Query similar memories via `MemoryRepository` + `VectorIndex` +
       `EmbeddingProvider` to infer additional tags.
    3. Merge candidate tags with inferred tags and de-duplicate.
    4. Apply metadata only if overall confidence is above the configured
       threshold.
    5. Update the memory via `MemoryRepository.save` if changed.

- `LocalEnrichmentProvider` infrastructure adapter
  - Implements `EnrichmentProvider` without external services.
  - Uses rule-based extraction:
    - Tags: normalize words from title/content, filter stop-words, extract
      camelCase/PascalCase identifiers, programming language names.
    - Entities: same extraction pipeline but restricted to capitalized or
      quoted phrases and known technology names.
    - Summary: first sentence of content, or first `N` words if no sentence.
    - Confidence: derived from content length and extraction density.

- Frontmatter fields
  - `summary?: string`
  - `entities?: string[]`
  - Existing `tags` continues to be used.

## MODIFIED

- `src/domain/memory.ts`
  - Extend `Memory` and `MemoryInput` with optional `summary` and `entities`.
  - `updateMemory` preserves `summary` and `entities` when not supplied.

- `src/infrastructure/markdown_serializer.ts`
  - Serialize `summary` and `entities` in frontmatter when present.
  - Deserialize `summary` and `entities` into `Memory`.

- `src/application/use_cases/save_memory.ts`
  - After saving and indexing the memory, trigger `MemoryEnrichmentService`
    asynchronously.
  - Return the id immediately; enrichment runs in the background.

- `src/application/use_cases/update_memory.ts`
  - Same async enrichment trigger after save/index.

- `src/container_factory.ts`
  - Wire `MemoryEnrichmentService` with `LocalEnrichmentProvider`.

- `src/presentation/mcp/server.ts`
  - Ensure `save_memory` and `update_memory` tool outputs remain unchanged.
  - Enrichment happens transparently in the background.

- `specs/living/diamondblock-core.md`
  - Update to mention auto-enrichment.

## REMOVED

- Nothing.

## Affected Tests

- `src/domain/services/memory_enrichment.test.ts` (new)
- `src/infrastructure/local_enrichment_provider.test.ts` (new)
- `src/application/use_cases/save_memory.test.ts`
- `src/application/use_cases/update_memory.test.ts`
