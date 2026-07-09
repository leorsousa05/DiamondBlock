# Design Spec: Web UI Improvements and Fixes

## API Contracts

### Filesystem Browser
```
GET /api/fs/browse?path=<absolute_path>
→ 200 FileSystemBrowseResult
→ 400 { error: string }
```

```typescript
interface FileSystemBrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: string[];
  files: string[];
}
```

### Updated MCP Targets Endpoint
```
GET /api/mcp/targets
→ 200 McpTarget[]
```
```typescript
interface McpTarget {
  name: string;
  label: string;
  configPath: string;
  detected: boolean;
}
```

### Updated MCP Install Payload
```
POST /api/mcp/install
Body: {
  targets: string[];  // Support installing multiple targets at once
  dryRun?: boolean;
}
→ 200 { installed: string[], results: McpInstallResult[] }
```

### Updated Memories Search Endpoint
```
GET /api/memories?q=<query>&scope=<s>&limit=<n>
→ 200 (Memory & { score: number })[]
```

---

## Technical Details

### Backend Changes

1. **Expose `getConfigPath()` on `JsonFileMcpInstaller`**:
   Add a public `getConfigPath(): string` method returning `this.configPath()` on `JsonFileMcpInstaller` in `src/infrastructure/mcp_installers/json_file_installer.ts`.

2. **Directory Browsing route**:
   Create `src/presentation/web/routes/fs.routes.ts` mapping `GET /api/fs/browse`. Verify paths are valid, resolve paths, filter out hidden files, and read subdirectories.

3. **Memory Route Handler Update**:
   Update `src/presentation/web/routes/memory.routes.ts` to map search results to full `Memory` objects by fetching them from `memoryRepository.findById(id)`.

4. **MCP Route Handler Update**:
   Update `src/presentation/web/routes/mcp_install.routes.ts` to map installers using `getConfigPath()` and handle array `targets` in `POST /api/mcp/install`.

### Frontend Changes

1. **Dark Mode Style Rules**:
   Define a `.dark` body wrapper in `web/src/index.css` overwriting the custom property variables:
   ```css
   body.dark {
     --color-bg: #121214;
     --color-surface: #1e1e24;
     --color-surface-hover: #2a2a32;
     --color-border: #2d2d34;
     --color-border-strong: #454550;
     --color-text-primary: #f1f3f5;
     --color-text-secondary: #c1c2c5;
     --color-text-muted: #909296;
     --color-accent: #3b82f6;
     --color-accent-hover: #2563eb;
     --color-accent-light: #1e3a8a;
   }
   ```

2. **Lucide Icons Integration**:
   Install `lucide-react`. Replace emojis in all files:
   - Sidebar: `LayoutGrid` (Dashboard), `Brain` (Memories), `History` (Sessions), `Binary` (Index), `Flame` (Distill), `Plug` (MCP Install).
   - Theme Toggle: `Sun` / `Moon`.
   - General Buttons: `Plus`, `Trash2`, `Edit`, `Search`, `Folder`, `ArrowUp`, `Check`, `AlertTriangle`.

3. **Dashboard Improvements**:
   - SVG Bar Chart: count memory types.
   - SVG Line Chart: count sessions activity.
   - Sidebar theme switch: save state in localStorage.
   - Previews: list maps for last 3 memories and sessions.

4. **File Picker Modal**:
   In `IndexPage.tsx`, render a directory selection button next to the projectPath input. On click, open a Modal listing files and directories inside the current path. Clicking a folder navigates inside it; clicking the up arrow navigates to `parentPath`. Select confirms and writes the path to the input.
