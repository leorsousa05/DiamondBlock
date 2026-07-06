# Proposal: Automatic Memory Metadata Enrichment

## Motivation

DiamondBlock memories are only as useful as their discoverability. Today,
callers (agents or humans) must supply tags, titles, and structure manually.
This leads to several problems:

1. **Inconsistent tagging:** Different agents tag the same concept differently.
2. **Missing context:** A raw memory may not have a concise summary or extracted
   entities, making search results harder to scan.
3. **Redundancy:** Without good metadata, agents create duplicate memories
   because they cannot quickly tell that a similar memory already exists.

Automatic metadata enrichment solves these problems by generating tags, a
short summary, and key entities for every memory using only local resources.

## Goals

- Automatically enrich every memory on save/update with:
  - `tags`: relevant keywords and inferred categories
  - `summary`: a one-sentence or short-paragraph abstract
  - `entities`: named concepts (people, projects, technologies, decisions)
- Run enrichment asynchronously so the save/update call returns quickly.
- Use a hybrid strategy:
  - Extract tags/entities directly from the memory's title and content.
  - Infer additional tags from semantically similar existing memories.
- Apply enrichment only when confidence is above a configurable threshold.
- Persist enriched fields in the existing Markdown frontmatter.
- Allow callers to opt out or override by providing their own tags/summary.

## Non-Goals

- Deduplication or merging of memories (deferred).
- Quality scoring or ranking of memories (deferred).
- Cloud-based NLP services or external API calls.
- Real-time collaborative enrichment.
- Changing the memory schema in a backward-incompatible way.

## Constraints

- Must remain 100% local-first and offline-capable.
- Must follow Clean Architecture / Ports & Adapters.
- Must not add heavy dependencies.
- Must be deterministic and unit-testable.
- Must keep existing vault files readable.
