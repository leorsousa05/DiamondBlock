# Proposal: Web UI Interface — `dblock web` Command

## Motivation

DiamondBlock currently exposes its functionality through two interfaces:
1. **CLI** (`dblock` / `diamondblock`) — human-facing terminal commands
2. **MCP server** — machine-facing stdio protocol for AI agents

Both interfaces are powerful but complement different workflows. There is currently no graphical way to browse, search, manage, or monitor the vault. Users who want to inspect memories, review session logs, run distillation, or trigger a codebase index must do so through terminal commands that return tabular output.

A web interface would provide:
- **Visual browsing** of memories with full content rendering (Markdown)
- **Semantic search** with a real-time search box
- **Session inspection** — read distilled logs and raw sessions side-by-side
- **Index management** — start/stop/monitor indexing with a live progress bar via SSE
- **Distillation control** — trigger distillation and see results in real-time
- **Status dashboard** — vault health, embedding provider, counts at a glance
- **MCP installer UI** — select agents and install MCP config without CLI flags

## Scope

This change adds **a new presentation layer** (`src/presentation/web/`) and a **React SPA** (`web/`) that is served from the same Fastify process. It does NOT modify:
- Domain layer
- Application use cases (reused as-is)
- Infrastructure adapters (reused as-is)
- MCP server (unaffected)
- CLI existing commands (a new `web` command is added)

## Constraints

- **Local-only**: Listens on `localhost` only, no remote access, no auth
- **Same process**: The Fastify server calls use cases directly via the DI container — no subprocess or IPC
- **SSE for progress**: Long-running operations (index run, distill) stream progress via `text/event-stream`
- **Port default**: `3847` (configurable via `--port` flag and `.diamondblock.yml`)
- **Static serving**: `web/dist/` is copied to `dist/web/` at build time and served via `@fastify/static`
- **Build integration**: `npm run build` includes `npm run build:web` as a pre-step; `npm run dev:web` runs Vite dev server with proxy to local Fastify API

## Out of Scope (Deferred)

- Dark mode toggle (light-only in v1)
- Authentication / access control
- WebSocket-based real-time updates (SSE covers v1 needs)
- Multi-vault switching in the UI
- Mobile layout optimization (responsive but not mobile-first)
