# Tasks: Distiller Quality

Lightweight spec for the bug: distilled memories miss important session information.

## Problem

- Topics only match ~30 hardcoded tech keywords; architecture decisions, bug causes, preferences, constraints, and file references are invisible.
- Decisions only catch a handful of verbs; misses problems, action items, preferences, rejections, and file/symbol references.
- Memory title is `Distilled session <id>` — useless for semantic search.
- Low caps (8 topics / 5 decisions) flatten long sessions.

## Checklist

- [x] Extract categorized insights: decisions, problems/root causes, action items, preferences/rejections, references (file paths and symbols).
- [x] PT + EN sentence patterns for each category.
- [x] Use the first user message as the memory title (truncated), keeping the session id in source.
- [x] Emit only non-empty sections in the distilled content.
- [x] Raise caps (topics 10, decisions 8, new categories 5 each).
- [x] Keep one memory per session and existing DistillResult contract.
- [x] Tests for each new category, title, section omission, and caps.
- [x] Existing distiller tests keep passing.
- [x] Run `npm test` and `npm run typecheck`.
