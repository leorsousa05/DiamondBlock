# Spec Delta: Web UI Improvements

## ADDED — `src/presentation/web/routes/fs.routes.ts`
**Status:** ADDED  
Endpoint: `GET /api/fs/browse?path=<absolute_path>`  
Returns directories and files in the requested path, allowing visual browsing of the host filesystem.

---

## MODIFIED — `src/infrastructure/mcp_installers/json_file_installer.ts`
**Status:** MODIFIED  
Expose `getConfigPath(): string` as a public method to get the path of the installer target.

---

## MODIFIED — `src/presentation/web/routes/memory.routes.ts`
**Status:** MODIFIED  
`GET /api/memories` resolves full memory objects when searching semantically via `SearchMemoryUseCase` so all table properties (`type`, `tags`, `updatedAt`) display correctly.

---

## MODIFIED — `src/presentation/web/routes/mcp_install.routes.ts`
**Status:** MODIFIED  
Update endpoints to align properties (`name`, `label`, `configPath`, `detected`) and support array inputs on install requests.

---

## MODIFIED — `src/presentation/web/server.ts`
**Status:** MODIFIED  
Register `fsRoutes` plugin under the `/api` route.

---

## MODIFIED — `web/` components & pages
**Status:** MODIFIED  
- Update `Sidebar.tsx` with Lucide icons and dark mode switcher.
- Implement theme classes in `index.css`.
- Add FolderPicker modal in `IndexPage.tsx`.
- Revamp `StatusPage.tsx` (Dashboard) with previews and SVG graphs.
- Fix target key selection in `McpInstallPage.tsx`.
- Install `lucide-react` in `web/package.json`.
