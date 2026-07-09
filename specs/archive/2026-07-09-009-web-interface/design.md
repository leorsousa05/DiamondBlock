# Design: Web Interface

## Architecture Overview

This feature follows Clean Architecture's **Presentation layer extension** pattern. The existing domain, application, and infrastructure layers are untouched. A new presentation sublayer (`web`) is added alongside the existing `cli` and `mcp` sublayers.

```
src/presentation/
├── cli/
│   └── index.ts                  ← MODIFIED: adds `web` subcommand
├── mcp/
│   └── server.ts                 ← UNMODIFIED
└── web/                          ← NEW
    ├── server.ts                 ← Fastify server factory + lifecycle
    ├── sse_manager.ts            ← SSE channel multiplexer
    └── routes/
        ├── status.routes.ts      ← GET /api/status
        ├── memory.routes.ts      ← CRUD + search for memories
        ├── session.routes.ts     ← List + show sessions
        ├── index.routes.ts       ← Codebase index management + SSE
        ├── distill.routes.ts     ← Distillation trigger + SSE
        └── mcp_install.routes.ts ← MCP installer

web/                              ← NEW — React SPA subproject
├── package.json
├── vite.config.ts
├── index.html
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   └── client.ts             ← Typed fetch wrapper for the REST API
    ├── components/
    │   ├── Layout.tsx            ← Sidebar + main content shell
    │   ├── Sidebar.tsx           ← Navigation links
    │   ├── StatusBadge.tsx       ← Inline provider/count badges
    │   ├── MemoryCard.tsx        ← Memory list item
    │   ├── MemoryDetail.tsx      ← Full memory with Markdown rendering
    │   ├── MemoryForm.tsx        ← Create / edit memory form
    │   ├── SessionCard.tsx       ← Session list item
    │   ├── SessionDetail.tsx     ← Full session log viewer
    │   ├── ProgressBar.tsx       ← SSE-driven progress component
    │   ├── SearchBar.tsx         ← Debounced semantic search input
    │   ├── DataTable.tsx         ← Generic sortable/paginated table
    │   └── ConfirmDialog.tsx     ← Delete confirmation modal
    └── pages/
        ├── StatusPage.tsx        ← /
        ├── MemoriesPage.tsx      ← /memories
        ├── MemoryDetailPage.tsx  ← /memories/:id
        ├── MemoryNewPage.tsx     ← /memories/new
        ├── MemoryEditPage.tsx    ← /memories/:id/edit
        ├── SessionsPage.tsx      ← /sessions
        ├── SessionDetailPage.tsx ← /sessions/:id
        ├── IndexPage.tsx         ← /index
        ├── DistillPage.tsx       ← /distill
        └── McpInstallPage.tsx    ← /mcp-install
```

---

## Patterns Applied

### [Padrões Aplicados]

1. **Clean Architecture — Presentation Layer Extension**
   The `src/presentation/web/` layer is a thin adapter. It maps HTTP requests/responses to use case inputs/outputs. No domain logic lives here.

2. **Adapter Pattern (HTTP ↔ Use Cases)**
   Each route file is a Fastify plugin that imports use cases from the DI container and translates HTTP verbs/params into use case inputs. Errors from use cases are mapped to HTTP status codes via a shared error-mapper utility.

3. **Server-Sent Events (SSE) for Streaming**
   `sse_manager.ts` implements a named-channel multiplexer. Each long-running operation (index, distill) opens a channel identified by an `operationId` (nanoid). The client subscribes to `/api/events/:operationId` and receives progress events. This avoids WebSocket complexity while enabling real-time feedback.

4. **Static Asset Serving (Self-contained binary)**
   `@fastify/static` serves the pre-built Vite bundle from `dist/web/`. During development, Vite runs its own dev server on `3848` with a proxy to Fastify on `3847`, bypassing static serving entirely.

5. **Subproject Pattern (web/)**
   The React frontend lives in a sibling `web/` directory with its own `package.json`. It is built by `npm run build:web` (which runs `cd web && npm run build && cp -r dist ../dist/web`). This keeps frontend dependencies isolated from the Node.js backend.

6. **Progressive Enhancement / Semantic HTML**
   The frontend avoids heavy animation libraries. Tables, forms, and navigation use semantic HTML elements. CSS is plain Vanilla CSS with CSS custom properties for the design system.

### [Estratégia de Implementação]

1. **Phase 1 — Backend Fastify server + routes**
   Build `src/presentation/web/server.ts` that creates and configures a Fastify instance. Register `@fastify/cors` (localhost only), `@fastify/static` (serving `dist/web/`), and the route plugins. Wire use cases from the Container passed in. Export `createWebServer(container, options)` factory.

2. **Phase 2 — CLI integration**
   Add `program.command('web')` to `src/presentation/cli/index.ts`. This command loads the container (reusing `loadContainer()`), calls `createWebServer(container, { port, host: '127.0.0.1' })`, starts the server, opens the browser (optional, `--no-open` flag), and keeps the process alive.

3. **Phase 3 — SSE Manager**
   `SseManager` is a class that holds a `Map<string, ServerResponse[]>` of subscribers per channel. It exposes `createChannel(id)`, `send(id, event, data)`, `complete(id)`, and `subscribe(id, reply)`. Both the index and distill routes use it.

4. **Phase 4 — Frontend SPA**
   Initialize Vite + React inside `web/`. Create `api/client.ts` with typed fetch functions matching every REST endpoint. Build pages progressively: Status → Memories → Sessions → Index → Distill → MCP Install.

5. **Phase 5 — Build integration**
   Update `package.json` scripts: add `build:web`, `dev:web`, and prefix existing `build` with `npm run build:web && tsc`.

---

## REST API Contract

All endpoints are under the `/api/` prefix. The frontend communicates only with this prefix. Errors follow `{ error: string; details?: unknown }`.

### Status

```
GET /api/status
→ 200 VaultStatus
```

```typescript
interface VaultStatus {
  vaultPath: string;
  embeddingProvider: 'local' | 'openai';
  memoryCount: number;
  sessionCount: number;
  projectCount: number;
  version: string;
}
```

### Memories

```
GET  /api/memories?scope=<s>&project=<p>&limit=<n>&q=<query>
→ 200 Memory[]
    query param `q` triggers semantic search; without it, lists all

GET  /api/memories/:id
→ 200 Memory
→ 404 { error: "Memory not found" }

POST /api/memories
Body: CreateMemoryBody → 201 { id: string }

PATCH /api/memories/:id
Body: UpdateMemoryBody → 200 Memory

DELETE /api/memories/:id
→ 204

POST /api/memories/purge
Body: PurgeMemoriesBody → 200 { deleted: number }
```

```typescript
interface CreateMemoryBody {
  title: string;
  content: string;
  type: 'user' | 'project' | 'knowledge' | 'distilled';
  scope?: string;
  projectId?: string;
  tags?: string[];
  confidence?: number;
}

interface UpdateMemoryBody {
  title?: string;
  content?: string;
  type?: MemoryType;
  scope?: string;
  tags?: string[];
  confidence?: number;
  append?: boolean;  // if true, appends to existing content
}

interface PurgeMemoriesBody {
  scope?: string;
  projectId?: string;
  source?: string;
}
```

### Sessions

```
GET /api/sessions?project=<p>&limit=<n>
→ 200 Session[]

GET /api/sessions/:id
→ 200 Session
→ 404 { error: "Session not found" }
```

```typescript
interface Session {
  id: string;
  projectId: string;
  createdAt: string;  // ISO 8601
  processed: boolean;
  messageCount: number;
  messages?: SessionMessage[];  // only included in GET /api/sessions/:id
}

interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

### Codebase Index

```
GET  /api/index/status?project=<p>
→ 200 IndexStatus

GET  /api/index/chunks?project=<p>&limit=<n>
→ 200 CodeChunk[]

GET  /api/index/search?q=<query>&project=<p>&limit=<n>
→ 200 CodeChunk[]

POST /api/index/run
Body: RunIndexBody → 202 { operationId: string }
(Streams progress via GET /api/events/:operationId)

POST /api/index/purge
Body: { projectId?: string } → 200 { deleted: number }

POST /api/index/clean-orphans
Body: { projectId?: string } → 200 { cleaned: number }
```

```typescript
interface IndexStatus {
  projectId: string;
  fileCount: number;
  chunkCount: number;
  lastIndexedAt: string | null;
}

interface RunIndexBody {
  projectPath?: string;
  projectId?: string;
  force?: boolean;
  dryRun?: boolean;
}

interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  chunkType: string;
  language: string;
}
```

### Distillation

```
POST /api/distill
Body: DistillBody → 202 { operationId: string }
(Streams progress via GET /api/events/:operationId)
```

```typescript
interface DistillBody {
  dryRun?: boolean;
  limit?: number;
}
```

### MCP Install

```
GET  /api/mcp/targets
→ 200 McpTarget[]

POST /api/mcp/install
Body: InstallMcpBody → 200 { installed: string[] }
```

```typescript
interface McpTarget {
  name: string;
  label: string;
  configPath: string;
  detected: boolean;  // true if config file already exists
}

interface InstallMcpBody {
  targets: string[];  // target names
  dryRun?: boolean;
}
```

### SSE Events

```
GET /api/events/:operationId
Content-Type: text/event-stream

Events emitted:
  event: progress
  data: { phase: string; current: number; total: number; message: string }

  event: complete
  data: { result: IndexCodebaseOutput | DistillSessionsOutput }

  event: error
  data: { error: string }
```

---

## Error Mapping

| Use Case Error | HTTP Status |
|----------------|-------------|
| Not found | 404 |
| Validation (Zod) | 400 |
| Missing project | 400 |
| Scope mismatch | 422 |
| Any other | 500 |

---

## Frontend Design System

**Typography**: Inter (Google Fonts fallback: system-ui)

**Color palette (CSS custom properties)**:
```css
--color-bg: #f8f9fa;
--color-surface: #ffffff;
--color-surface-hover: #f1f3f5;
--color-border: #dee2e6;
--color-border-strong: #ced4da;
--color-text-primary: #212529;
--color-text-secondary: #6c757d;
--color-text-muted: #adb5bd;
--color-accent: #228be6;
--color-accent-hover: #1971c2;
--color-accent-light: #e7f5ff;
--color-danger: #fa5252;
--color-danger-light: #fff5f5;
--color-success: #40c057;
--color-warning: #fab005;
```

**Layout**: Fixed sidebar (240px) + scrollable main content area. Sidebar contains the navigation links grouped by feature domain.

**Sidebar navigation**:
```
◆ DiamondBlock
─────────────
  Dashboard
  Memories
  Sessions
  Codebase Index
  Distill
  MCP Install
─────────────
  v0.5.0 · local
```

---

## Build Integration

New `package.json` scripts:

```json
{
  "build:web": "cd web && npm run build && node scripts/copy-web-dist.mjs",
  "build": "npm run build:web && tsc",
  "dev:web": "cd web && npm run dev",
  "web": "tsx src/presentation/cli/index.ts web"
}
```

`scripts/copy-web-dist.mjs` — copies `web/dist/` → `dist/web/`:
```javascript
// Simple Node.js ESM script using fs.cpSync
```

---

## Test Plan

### Unit Tests (`src/presentation/web/`)

| Component | Test | Why |
|-----------|------|-----|
| `sse_manager.ts` | `createChannel` / `send` / `complete` / subscribe | Branching logic, side effects (Map mutations) |
| `memory.routes.ts` | Each route handler (mock use cases) | Public API surface |
| `index.routes.ts` | SSE emission on progress callback | Side effects, async |
| `distill.routes.ts` | SSE emission, operationId uniqueness | Side effects |

### Integration Tests

| Scenario | Method |
|----------|--------|
| `GET /api/memories` returns 200 + array | Fastify `inject()` |
| `POST /api/memories` creates memory, returns 201 | Fastify `inject()` + repo assertions |
| `DELETE /api/memories/:id` returns 204 | Fastify `inject()` |
| `POST /api/index/run` returns 202 + operationId | Fastify `inject()` |
| SSE stream receives `complete` event | EventSource mock |

### Frontend Tests

- Component smoke tests with Vitest + `@testing-library/react` (StatusPage, MemoriesPage, MemoryForm)
- API client tests with `msw` (mock service worker) for fetch mocking

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `@xenova/transformers` model loading blocks HTTP startup | Medium | High | Delay model load; Fastify server starts accepting requests immediately; embedding-dependent routes return 503 if model not ready |
| `better-sqlite3` not thread-safe across async | Low | Medium | SQLite in Node is single-threaded; Fastify is not multi-threaded — no issue in single-process mode |
| `dist/web/` not found at runtime (forgot build:web) | Medium | Medium | `createWebServer` checks if `dist/web/index.html` exists on startup; if not, prints clear error and exits |
| Vite peer-dep conflicts between root and web/ | Low | Low | web/ has its own node_modules; isolated package.json |

## Deferred

- WebSocket for true bi-directional comms (SSE sufficient for v1)
- Dark mode (v2)
- Authentication (v2 — configurable)
- Mobile layout (v2)
- Plugin system for custom pages
