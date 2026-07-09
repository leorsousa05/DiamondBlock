# Spec Delta: Web Interface Layer

## ADDED — `src/presentation/web/`

### `src/presentation/web/server.ts`
**Status:** ADDED

Fastify HTTP server factory. Entry point for the web presentation layer.

Exports:
- `createWebServer(container: Container, options: WebServerOptions): FastifyInstance`
- `startWebServer(container: Container, options: WebServerOptions): Promise<void>`

Responsibilities:
- Registers `@fastify/cors` restricted to localhost
- Registers `@fastify/static` pointing to `dist/web/`
- Registers all route plugins under `/api`
- Implements SPA fallback (non-`/api` requests → serve `index.html`)
- Validates that `dist/web/index.html` exists before starting; prints a clear error and exits if not

### `src/presentation/web/sse_manager.ts`
**Status:** ADDED

Server-Sent Events multiplexer for long-running operations.

Exports:
- `class SseManager`
  - `createChannel(operationId: string): void`
  - `subscribe(operationId: string, reply: FastifyReply): void`
  - `send<T>(operationId: string, event: string, data: T): void`
  - `complete<T>(operationId: string, result: T): void`
  - `error(operationId: string, message: string): void`

### `src/presentation/web/routes/status.routes.ts`
**Status:** ADDED  
Routes: `GET /api/status`

### `src/presentation/web/routes/memory.routes.ts`
**Status:** ADDED  
Routes: `GET /api/memories`, `GET /api/memories/:id`, `POST /api/memories`, `PATCH /api/memories/:id`, `DELETE /api/memories/:id`, `POST /api/memories/purge`

### `src/presentation/web/routes/session.routes.ts`
**Status:** ADDED  
Routes: `GET /api/sessions`, `GET /api/sessions/:id`

### `src/presentation/web/routes/index.routes.ts`
**Status:** ADDED  
Routes: `GET /api/index/status`, `GET /api/index/chunks`, `GET /api/index/search`, `POST /api/index/run`, `POST /api/index/purge`, `POST /api/index/clean-orphans`

### `src/presentation/web/routes/distill.routes.ts`
**Status:** ADDED  
Routes: `POST /api/distill`

### `src/presentation/web/routes/mcp_install.routes.ts`
**Status:** ADDED  
Routes: `GET /api/mcp/targets`, `POST /api/mcp/install`

### `src/presentation/web/routes/events.routes.ts`
**Status:** ADDED  
Routes: `GET /api/events/:operationId`

---

## ADDED — `web/` (Frontend SPA subproject)

### `web/package.json`
**Status:** ADDED  
React 18 + Vite + TypeScript SPA. Dependencies: `react`, `react-dom`, `react-router-dom`, `react-markdown`. DevDependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`.

### `web/vite.config.ts`
**Status:** ADDED  
Proxy: `/api` → `http://localhost:3847` for development.

### `web/src/api/client.ts`
**Status:** ADDED  
Typed fetch wrapper. Exports one function per REST endpoint plus all shared TypeScript interfaces.

### `web/src/components/`
**Status:** ADDED (8 components)  
`Layout`, `Sidebar`, `DataTable`, `ProgressBar`, `SearchBar`, `ConfirmDialog`, `StatusBadge`, `MemoryCard`

### `web/src/pages/`
**Status:** ADDED (10 pages)  
`StatusPage`, `MemoriesPage`, `MemoryDetailPage`, `MemoryNewPage`, `MemoryEditPage`, `SessionsPage`, `SessionDetailPage`, `IndexPage`, `DistillPage`, `McpInstallPage`

---

## ADDED — `scripts/copy-web-dist.mjs`
**Status:** ADDED  
Node.js ESM script that copies `web/dist/` → `dist/web/` after Vite build.

---

## MODIFIED — `src/presentation/cli/index.ts`
**Status:** MODIFIED

**Change:** Add `web` subcommand to the Commander program.

```diff
+ program
+   .command('web')
+   .description('Start the DiamondBlock web UI')
+   .option('--port <port>', 'HTTP port', '3847')
+   .option('--no-open', 'do not open browser automatically')
+   .action(async (options) => {
+     const { ...container } = await loadContainer();
+     await startWebServer(container, {
+       port: parseInt(options.port, 10),
+       host: '127.0.0.1',
+       staticDir: join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web'),
+       open: options.open,
+     });
+   });
```

---

## MODIFIED — `package.json`
**Status:** MODIFIED

**Changes:**
- Add `fastify`, `@fastify/cors`, `@fastify/static` to `dependencies`
- Add script `build:web`
- Update script `build` to run `build:web` first
- Add script `dev:web`

---

## MODIFIED — `tsconfig.json`
**Status:** MODIFIED (if not already present)

**Change:** Add `"web"` to the `exclude` array to prevent TypeScript from compiling the frontend subproject as part of the root project.

---

## UNCHANGED
- `src/domain/` — all domain models and services
- `src/application/` — all use cases and ports
- `src/infrastructure/` — all adapters
- `src/presentation/mcp/server.ts` — MCP server unaffected
- All existing CLI commands
