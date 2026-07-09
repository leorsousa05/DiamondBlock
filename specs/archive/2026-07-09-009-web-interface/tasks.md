# Tasks: Web Interface (009-web-interface)

## Phase 1 — Backend: Fastify Server + Routes

### 1.1 Install dependencies
- [x] Add to root `package.json` devDependencies: `fastify`, `@fastify/cors`, `@fastify/static`
  ```
  npm install fastify @fastify/cors @fastify/static
  ```
- [x] Verify no ESM/CJS conflicts with existing packages

### 1.2 Create `src/presentation/web/sse_manager.ts`
- [x] Define `SseEvent<T>` interface: `{ event: string; data: T }`
- [x] Implement `SseManager` class:
  - `channels: Map<string, ServerResponse[]>`
  - `createChannel(operationId: string): void`
  - `subscribe(operationId: string, reply: FastifyReply): void`
  - `send<T>(operationId: string, event: string, data: T): void`
  - `complete(operationId: string): void` — sends `complete` event then closes all subscribers and removes channel
  - `error(operationId: string, message: string): void` — sends `error` event then cleans up

### 1.3 Create `src/presentation/web/routes/status.routes.ts`
- [x] Fastify plugin registered at `/api/status`
- [x] `GET /api/status` → calls `container.configStore.load()`, counts memories/sessions via repositories, returns `VaultStatus`

### 1.4 Create `src/presentation/web/routes/memory.routes.ts`
- [x] `GET /api/memories` — list (no `q`) or semantic search (with `q`), supports `scope`, `project`, `limit` query params
- [x] `GET /api/memories/:id` — find by id from repo, 404 if not found
- [x] `POST /api/memories` — validate body with Zod, call `SaveMemoryUseCase`
- [x] `PATCH /api/memories/:id` — validate body with Zod, call `UpdateMemoryUseCase`
- [x] `DELETE /api/memories/:id` — call `DeleteMemoryUseCase`, return 204
- [x] `POST /api/memories/purge` — call repo purge, return `{ deleted: number }`

### 1.5 Create `src/presentation/web/routes/session.routes.ts`
- [x] `GET /api/sessions` — list sessions, supports `project`, `limit` params
- [x] `GET /api/sessions/:id` — get session by id with full messages, 404 if not found

### 1.6 Create `src/presentation/web/routes/index.routes.ts`
- [x] `GET /api/index/status` — load manifest from `codebaseIndexRepository`, return `IndexStatus`
- [x] `GET /api/index/chunks` — list chunks from `codebaseChunkRepository`, supports `project`, `limit`
- [x] `GET /api/index/search` — semantic search chunks using `vectorIndex`
- [x] `POST /api/index/run` — generate `operationId` (nanoid), call `IndexCodebaseUseCase.execute(input, progressCallback)` where callback calls `sseManager.send()`, return 202 immediately; run indexing in background (no await in handler)
- [x] `POST /api/index/purge` — delete all chunks for project
- [x] `POST /api/index/clean-orphans` — call `orphanedChunkCleaner`

### 1.7 Create `src/presentation/web/routes/distill.routes.ts`
- [x] `POST /api/distill` — generate `operationId`, start `DistillSessionsUseCase` in background, stream result via SSE, return 202

### 1.8 Create `src/presentation/web/routes/mcp_install.routes.ts`
- [x] `GET /api/mcp/targets` — detect installed agents, return list with `detected` flag
- [x] `POST /api/mcp/install` — call `InstallMcpUseCase` for each target, return `{ installed: string[] }`

### 1.9 Create `src/presentation/web/routes/events.routes.ts`
- [x] `GET /api/events/:operationId` — set Content-Type to `text/event-stream`, call `sseManager.subscribe(operationId, reply)`

### 1.10 Create `src/presentation/web/server.ts`
- [x] `createWebServer(container: Container, options: WebServerOptions): FastifyInstance`
- [x] `WebServerOptions`: `{ port: number; host: string; staticDir: string; open?: boolean }`
- [x] Register plugins: `@fastify/cors` (origin: localhost), `@fastify/static` (root: `staticDir`, wildcard: false for SPA fallback)
- [x] Register all route plugins under `/api`
- [x] SPA fallback: any non-`/api` request not matching a static file → serve `index.html`
- [x] On startup, check `staticDir/index.html` exists, emit clear error if not
- [x] Export `startWebServer(container, options)` that calls `server.listen()` and optionally opens browser

---

## Phase 2 — CLI Integration

### 2.1 Add `web` command to `src/presentation/cli/index.ts`
- [x] `program.command('web')`
  - `.description('Start the DiamondBlock web interface')`
  - `.option('--port <port>', 'HTTP port', '3847')`
  - `.option('--no-open', 'do not open browser automatically')`
  - `.action(async (options) => { ... })`
- [x] In action: call `loadContainer()`, call `startWebServer(container, { port: parseInt(options.port), host: '127.0.0.1', staticDir: join(dirname, '..', '..', 'web'), open: options.open })`
- [x] Print startup message: `DiamondBlock Web UI running at http://localhost:<port>`

---

## Phase 3 — Frontend SPA

### 3.1 Initialize Vite + React project in `web/`
- [x] `cd web && npm create vite@latest . -- --template react-ts`
- [x] Clean default files (remove `App.css` default content, `vite.svg`, etc.)
- [x] Add to `web/package.json` devDependencies: `react-router-dom`, `react-markdown`
- [x] Configure `web/vite.config.ts` proxy: `{ '/api': { target: 'http://localhost:3847', changeOrigin: true } }`

### 3.2 Create design system in `web/src/index.css`
- [x] Define all CSS custom properties (colors, spacing, typography, border-radius, shadows)
- [x] Import Inter font from Google Fonts
- [x] Reset and base styles
- [x] Utility classes: `.sr-only`, `.text-muted`, `.badge`, `.badge-success`, `.badge-warning`

### 3.3 Create `web/src/api/client.ts`
- [x] Typed fetch wrapper: `async function apiFetch<T>(url: string, options?: RequestInit): Promise<T>`
- [x] Export typed functions for each endpoint:
  - `getStatus(): Promise<VaultStatus>`
  - `listMemories(params): Promise<Memory[]>`
  - `searchMemories(query, params): Promise<Memory[]>`
  - `getMemory(id): Promise<Memory>`
  - `createMemory(body): Promise<{ id: string }>`
  - `updateMemory(id, body): Promise<Memory>`
  - `deleteMemory(id): Promise<void>`
  - `purgeMemories(body): Promise<{ deleted: number }>`
  - `listSessions(params): Promise<Session[]>`
  - `getSession(id): Promise<Session>`
  - `getIndexStatus(project?): Promise<IndexStatus>`
  - `listChunks(params): Promise<CodeChunk[]>`
  - `searchChunks(query, params): Promise<CodeChunk[]>`
  - `runIndex(body): Promise<{ operationId: string }>`
  - `purgeIndex(body): Promise<{ deleted: number }>`
  - `cleanOrphans(body): Promise<{ cleaned: number }>`
  - `startDistill(body): Promise<{ operationId: string }>`
  - `getMcpTargets(): Promise<McpTarget[]>`
  - `installMcp(body): Promise<{ installed: string[] }>`
- [x] Export all shared types (mirroring design.md contracts)

### 3.4 Create Layout components
- [x] `web/src/components/Layout.tsx` — flex container: `<Sidebar>` + `<main>`
- [x] `web/src/components/Sidebar.tsx` — navigation with `<NavLink>` from react-router-dom, active state styling, version badge at bottom
- [x] `web/src/components/DataTable.tsx` — generic table: columns prop (header, accessor, render?), rows, empty state, optional pagination
- [x] `web/src/components/ProgressBar.tsx` — SSE-driven: accepts `operationId` prop, subscribes to `/api/events/:operationId`, renders progress bar + phase message, shows result on complete
- [x] `web/src/components/SearchBar.tsx` — debounced input (300ms), calls `onChange(query)` prop
- [x] `web/src/components/ConfirmDialog.tsx` — modal overlay with confirm/cancel
- [x] `web/src/components/StatusBadge.tsx` — small pill badge with color variants

### 3.5 Create pages

#### StatusPage (`web/src/pages/StatusPage.tsx`)
- [x] Fetch `GET /api/status` on mount
- [x] Display: vault path, embedding provider badge, memory count, session count, project count
- [x] Card layout with stats

#### MemoriesPage (`web/src/pages/MemoriesPage.tsx`)
- [x] `SearchBar` at top — triggers semantic search when query present, otherwise list
- [x] Filter bar: scope selector, limit selector
- [x] `DataTable` with columns: title, type badge, scope, tags, updated_at
- [x] Row click → navigate to `/memories/:id`
- [x] "New Memory" button → `/memories/new`
- [x] Delete button per row (with `ConfirmDialog`)
- [x] Purge button (with `ConfirmDialog` + scope/project inputs)

#### MemoryDetailPage (`web/src/pages/MemoryDetailPage.tsx`)
- [x] Fetch `GET /api/memories/:id`
- [x] Show all fields; render `content` as Markdown via `react-markdown`
- [x] Edit button → `/memories/:id/edit`
- [x] Delete button (with `ConfirmDialog`) → redirects to `/memories` on success

#### MemoryNewPage / MemoryEditPage
- [x] `MemoryForm.tsx` component: fields for title, content (textarea), type (select), scope, tags (comma-separated input), confidence (0-1 slider)
- [x] On submit: call `createMemory()` or `updateMemory()`

#### SessionsPage (`web/src/pages/SessionsPage.tsx`)
- [x] Fetch `GET /api/sessions`
- [x] Filter by project, limit
- [x] `DataTable`: id, projectId, created_at, processed badge, message count
- [x] Row click → `/sessions/:id`

#### SessionDetailPage (`web/src/pages/SessionDetailPage.tsx`)
- [x] Fetch `GET /api/sessions/:id`
- [x] Show messages in a chat-style log (role: user/assistant, content)
- [x] Show processed badge

#### IndexPage (`web/src/pages/IndexPage.tsx`)
- [x] Status section: `GET /api/index/status` → file count, chunk count, last indexed
- [x] "Run Index" form: projectPath input (optional), force checkbox, dry-run checkbox
- [x] On submit: POST `/api/index/run` → get `operationId` → show `<ProgressBar operationId={...} />`
- [x] Chunks tab: `DataTable` of chunks with search
- [x] Purge + Clean Orphans buttons (with `ConfirmDialog`)

#### DistillPage (`web/src/pages/DistillPage.tsx`)
- [x] Show pending (unprocessed) session count
- [x] Form: limit input, dry-run checkbox
- [x] On submit: POST `/api/distill` → get `operationId` → show `<ProgressBar>`
- [x] Show result: processed count, memories created

#### McpInstallPage (`web/src/pages/McpInstallPage.tsx`)
- [x] Fetch `GET /api/mcp/targets` on mount
- [x] Show each target as a card with: name, config path, detected badge
- [x] Checkbox selection + "Install Selected" button
- [x] Dry-run toggle
- [x] On submit: POST `/api/mcp/install` → show result

### 3.6 Setup routing in `web/src/App.tsx`
- [x] Use `react-router-dom` `BrowserRouter` + `Routes`
- [x] Define all routes matching the pages above
- [x] Wrap in `<Layout>`

---

## Phase 4 — Build Integration

### 4.1 Create `scripts/copy-web-dist.mjs`
- [x] Node.js ESM script: `fs.cpSync('web/dist', 'dist/web', { recursive: true })`
- [x] Create `dist/web/` dir if not exists

### 4.2 Update root `package.json`
- [x] Add script: `"build:web": "cd web && npm install && npm run build && node scripts/copy-web-dist.mjs"`
- [x] Update `"build"`: `"npm run build:web && tsc"`
- [x] Add script: `"dev:web": "cd web && npm run dev"`

### 4.3 Update `tsconfig.json`
- [x] Ensure `web/` is excluded from the root TypeScript compilation: add `"exclude": ["web"]` if not present

---

## Phase 5 — Tests

### 5.1 Backend unit tests (`src/presentation/web/`)
- [x] `sse_manager.test.ts` — test channel creation, send, complete, error, subscriber cleanup
- [x] `memory.routes.test.ts` — use Fastify `inject()` for all 6 endpoints; mock use cases
- [x] `session.routes.test.ts` — list and show
- [x] `index.routes.test.ts` — status, chunks, run (SSE), purge
- [x] `distill.routes.test.ts` — trigger + SSE

### 5.2 Frontend component tests (`web/src/`)
- [x] Install: `@testing-library/react`, `@testing-library/user-event`, `msw`, `vitest`
- [x] `StatusPage.test.tsx` — renders stats from mocked API
- [x] `MemoriesPage.test.tsx` — list renders, delete dialog, search triggers
- [x] `MemoryForm.test.tsx` — form submission calls API
- [x] `ProgressBar.test.tsx` — SSE events update progress bar

---

## Completion Criteria

- [x] `dblock web` starts a server on `localhost:3847`
- [x] Browser opens to `http://localhost:3847` showing the Status dashboard
- [x] All 10 pages are accessible and functional
- [x] Creating/editing/deleting memories works end-to-end
- [x] Index run shows live progress bar via SSE
- [x] Distill shows live progress via SSE
- [x] MCP install page shows detected agents and installs on submit
- [x] `npm run build` produces `dist/web/` with the SPA bundle
- [x] All backend unit tests pass (`vitest run`)
- [x] TypeScript compiles without errors (`tsc --noEmit`)
