# Proposal: Web UI Improvements and Fixes

This spec outlines the implementation of several UI, presentation, and contract improvements requested by the user, as well as fixing a contract mismatch in the MCP installation page and improving memory search result rendering.

## Motivation

1. **Visual Icons**: Replacing text emojis with a standard icon library (`lucide-react`) makes the application feel more polished, consistent, and professional.
2. **Dark Mode**: High-contrast light mode can cause eye strain; adding a dark mode option togglable from the sidebar increases accessibility.
3. **Interactive Dashboard**: Previews of recent memories/sessions and interactive SVG metrics/graphs give the user a quick summary of their vault's activity upon startup.
4. **Local File Browser**: Manually entering directory paths for codebase indexing is error-prone. A file picker that communicates with the local host filesystem allows selecting folders visually.
5. **Contract Mismatches**: The MCP installer list agent names were blank and selection was buggy because the frontend expected `name`, `label`, and `configPath` whereas the backend returned `agent` and `detected`.
6. **Search Quality**: Semantic search results did not show memory types, scopes, tags, or updated dates because the route handler returned the minimal use case mapping instead of fully resolved memory objects.

## Proposed Changes

- **Frontend package**: Install `lucide-react` in `web/`.
- **Theme**: Add dark theme variables and a localStorage theme toggle.
- **Dashboard**:
  - Render a SVG bar chart showing the distribution of memory types.
  - Render a line/area chart showing recent session logging activity.
  - Render previews of the 3 most recent memories and 3 most recent sessions.
- **File System API**: Add `GET /api/fs/browse` endpoint.
- **Directory Picker**: Create a modal file picker in the codebase indexing page.
- **MCP installers**: Expose `getConfigPath()` publicly on `JsonFileMcpInstaller`.
- **Search endpoint**: Populate full memory object details for semantic search results in `/api/memories?q=...`.
