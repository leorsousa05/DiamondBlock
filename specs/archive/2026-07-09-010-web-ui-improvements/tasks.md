# Tasks: Web UI Improvements and Fixes (010-web-ui-improvements)

## Phase 1 — Backend changes

### 1.1 Expose configPath in `JsonFileMcpInstaller`
- [x] Add public `getConfigPath(): string` to `JsonFileMcpInstaller` in `src/infrastructure/mcp_installers/json_file_installer.ts`.

### 1.2 Create `src/presentation/web/routes/fs.routes.ts`
- [x] Implement `fsRoutes` plugin:
  - `GET /api/fs/browse`
  - Get `path` from query (default to `process.cwd()`).
  - Read files and directories using `fs.promises.readdir` with `withFileTypes: true`.
  - Filter out hidden files/dirs starting with `.`.
  - Return `{ currentPath, parentPath, directories, files }`.

### 1.3 Update `src/presentation/web/routes/memory.routes.ts`
- [x] In `GET /api/memories` when `q` is present:
  - Call `SearchMemoryUseCase`.
  - For each result, resolve the full memory via `memoryRepository.findById(result.id)`.
  - Merge the score back into the returned memory objects: `{ ...memory, score: result.score }`.

### 1.4 Update `src/presentation/web/routes/mcp_install.routes.ts`
- [x] Update `GET /api/mcp/targets` to map installers using `getConfigPath()`, returning `name`, `label`, `configPath`, `detected`.
- [x] Update `POST /api/mcp/install` to handle array `targets` from body, installing for each target in loop and sending merged results.

### 1.5 Register `fsRoutes` in `src/presentation/web/server.ts`
- [x] Import and register `fsRoutes` under `/api`.

---

## Phase 2 — Frontend changes

### 2.1 Install `lucide-react`
- [x] Run `npm install lucide-react` in `/web/`.

### 2.2 Add fs.browse to API Client
- [x] In `web/src/api/client.ts`, add `browseDirectory(path?: string): Promise<FileSystemBrowseResult>` and update `McpTarget` interfaces.

### 2.3 Implement Dark Mode in index.css
- [x] Add `body.dark` styles in `web/src/index.css` overrides.

### 2.4 Add Theme Toggle and Lucide Icons in Sidebar.tsx
- [x] Update `web/src/components/Sidebar.tsx` to render a theme toggle button and use Lucide icons for all menu links.

### 2.5 Revamp StatusPage (Dashboard)
- [x] Fetch recent memories and sessions.
- [x] Render 3 cards: recent memories, recent sessions, and indexing card.
- [x] Draw SVG charts representing memory types count and recent session logging stats.
- [x] Replace emojis with Lucide icons.

### 2.6 Fix McpInstallPage.tsx mapping and bugs
- [x] Update card mapping from `target.agent` to `target.name`, using `target.label` and `target.configPath`.
- [x] Fix target checkbox toggling by using target name properly in state selection.

### 2.7 Create FolderPicker in IndexPage.tsx
- [x] Create a local directory browsing picker (FolderPicker modal or accordion) on the Codebase Index page that lets users navigate folders and select directories visually.

---

## Phase 3 — Build and test

### 3.1 Verify building
- [ ] Run `npm run build` in root and make sure both React app and TypeScript CLI compile without errors.

### 3.2 Verify test coverage
- [ ] Run `npm test` and verify all tests pass.
