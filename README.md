<p align="center">
  <picture>
    <img src="assets/diamondblock-logo.png" width="220" alt="DiamondBlock — diamond ore block">
  </picture>
</p>

<h1 align="center">DiamondBlock</h1>

<p align="center">
  <em>Local-first semantic memory server for AI coding agents.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 20+">
  <img src="https://img.shields.io/badge/MCP-stdio-6B4C9A?style=flat-square" alt="MCP stdio">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT license">
</p>

<p align="center">
  <strong>Private &middot; Semantic &middot; Persistent</strong><br>
  <sub>DiamondBlock keeps what matters between coding sessions — your preferences, project decisions, and distilled conversation context — without leaking data to the cloud.</sub>
</p>

---

## Features

- **Local-first:** all memories, embeddings, and indexes stay on your machine in Markdown + SQLite.
- **MCP server:** exposes `get_context`, `search_memory`, `save_memory`, `update_memory`, `delete_memory`, and `log_session` via stdio.
- **Semantic search:** local embeddings with `Xenova/all-MiniLM-L6-v2`, with optional OpenAI fallback.
- **Human CLI:** manage memories and sessions from the terminal with rich tables, colors, and spinners.
- **Session distillation:** raw session logs are distilled into curated memories automatically.
- **Agent friendly:** works with Claude Code, Kimi Code, AGY, and any MCP-compatible agent.

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

The fastest way to wire DiamondBlock into your agents is the built-in installer:

```bash
npx diamondblock install mcp
```

This detects supported agents on your machine and writes the correct MCP config for each one. Run with `--dry-run` to preview what would change:

```bash
npx diamondblock install mcp --dry-run
```

Install for a single agent only:

```bash
npx diamondblock install mcp --target kimi
```

Supported agents: `kimi`, `kimi-code`, `claude`, `codex`, `agy`, `cursor`, `windsurf`, `cline`, `aider`, `zed`, `continue`.

### Manual configuration

If you prefer to configure Kimi Code by hand, create or edit `~/.kimi/mcp.json`:

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

### `diamondblock install mcp [--target <agent>] [--dry-run]`

Install DiamondBlock as an MCP server for detected agents. Use `--dry-run` to preview and `--target` to install for a single agent.

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
