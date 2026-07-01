# DiamondBlock

Local-first semantic memory server for AI coding agents.

DiamondBlock keeps what matters between coding sessions: your preferences, project decisions, and distilled conversation context. It speaks the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) so agents like Claude Code, Kimi Code, and AGY can remember without leaking data to the cloud.

## Features

- **Local-first:** all memories, embeddings, and indexes stay on your machine in Markdown + SQLite.
- **MCP server:** exposes `get_context`, `search_memory`, `save_memory`, `update_memory`, `delete_memory`, and `log_session` via stdio.
- **Semantic search:** local embeddings with `Xenova/all-MiniLM-L6-v2`, with optional OpenAI fallback.
- **Human CLI:** manage memories and sessions from the terminal with rich tables, colors, and spinners.
- **Session distillation:** raw session logs are distilled into curated memories automatically.

## Install

Requires Node.js 20+.

```bash
npm install
npm run build
```

This builds TypeScript into `dist/` and registers the `diamondblock` and `dblock` binaries.

## Quick start

Initialize a vault. By default it lives at `~/.diamondblock`.

```bash
npx diamondblock init
```

Add a memory:

```bash
npx diamondblock memory add --title "Prefer TypeScript" --type user --scope user --content "Always prefer TypeScript over JavaScript."
```

Search memories:

```bash
npx diamondblock memory search "typescript"
```

Show the current status:

```bash
npx diamondblock status
```

## Configure MCP for Kimi Code

Create or edit `~/.kimi/mcp.json`:

```json
{
  "mcpServers": {
    "diamondblock": {
      "command": "node",
      "args": [
        "/path/to/diamondblock/dist/presentation/mcp/server.js"
      ],
      "env": {
        "DB_HOME": "${HOME}/.diamondblock"
      }
    }
  }
}
```

Replace `/path/to/diamondblock` with the absolute path to this repository.

### OpenAI embeddings (optional)

Add to `~/.diamondblock/.diamondblock.yml`:

```yaml
embeddingProvider: openai
openaiApiKey: sk-...
openaiEmbeddingModel: text-embedding-3-small
```

If omitted, DiamondBlock uses local embeddings and never calls a remote service.

## CLI reference

### `diamondblock init [path]`

Initialize a new vault. Uses `~/.diamondblock` or `$DB_HOME` when `path` is omitted.

### `diamondblock memory list [--scope <scope>] [--limit <n>]`

List memories as a table.

### `diamondblock memory search <query> [--scope <scope>] [--limit <n>]`

Search by semantic meaning. Falls back to keyword search if embeddings are unavailable.

### `diamondblock memory add --title <title> [--type <type>] [--scope <scope>] [--content <content>] [--tag <tag>]`

Create a memory. If `--content` is omitted, opens your default `$EDITOR`.

### `diamondblock memory show <id>`

Display one memory in Markdown format.

### `diamondblock memory edit <id>`

Open a memory in your default editor.

### `diamondblock memory delete <id> [--yes]`

Delete a memory. Asks for confirmation unless `--yes` is passed.

### `diamondblock session list [--limit <n>]`

List recent sessions.

### `diamondblock session show <id>`

Show the raw log of a session.

### `diamondblock distill [--dry-run] [--limit <n>]`

Distill unprocessed sessions into memories.

### `diamondblock status`

Show vault statistics: path, embedding provider, memory count, and session count.

## MCP tools reference

The MCP server exposes the same memory system to coding agents.

### `get_context`

Returns compact context for the current session.

```json
{
  "session_id": "sess_abc123",
  "project_id": "my-project",
  "mode": "coding"
}
```

### `search_memory`

Search memories by meaning or keyword.

```json
{
  "query": "authentication strategy",
  "scope": "project/my-project",
  "limit": 5
}
```

### `save_memory`

Create a memory.

```json
{
  "title": "Use JWT for auth",
  "content": "We decided to use signed JWTs stored in httpOnly cookies.",
  "type": "project",
  "scope": "project/my-project",
  "tags": ["auth", "architecture"]
}
```

### `update_memory`

Update or append to a memory.

```json
{
  "id": "mem_abc123",
  "content": "Updated decision...",
  "append": false
}
```

### `delete_memory`

Delete a memory.

```json
{
  "id": "mem_abc123"
}
```

### `log_session`

Record a raw session for later distillation.

```json
{
  "session_id": "sess_abc123",
  "project_id": "my-project",
  "messages": [
    { "role": "user", "content": "How do we handle auth?" },
    { "role": "assistant", "content": "Use JWT in httpOnly cookies." }
  ]
}
```

## Configuration

DiamondBlock reads `~/.diamondblock/.diamondblock.yml`:

```yaml
vaultPath: /home/me/.diamondblock
embeddingProvider: local
heartbeatIntervalMinutes: 60
contextWindowTokens: 8000
```

| Field | Default | Description |
|-------|---------|-------------|
| `vaultPath` | `~/.diamondblock` | Root directory of the vault. |
| `embeddingProvider` | `local` | `local` or `openai`. |
| `heartbeatIntervalMinutes` | `60` | Interval for automatic session distillation. |
| `contextWindowTokens` | `8000` | Target size for context returned to agents. |

## Development

```bash
npm install
npm run build
npm test
npm run typecheck
```

Run the CLI in dev mode:

```bash
npm run cli -- memory list
```

Run the MCP server manually:

```bash
npm run mcp
```

## License

MIT
