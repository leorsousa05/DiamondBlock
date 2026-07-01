# Spec: MCP Server

## Overview

O servidor MCP expõe a memória do DiamondBlock para coding agents via transporte stdio. Ele segue o protocolo Model Context Protocol (MCP) e oferece tools para leitura, escrita, busca e registro de sessão.

## Tools

### `get_context`

Entrega o contexto compacto que o agente deve receber no início da sessão.

Input:
```json
{
  "session_id": "sess_xyz789",
  "project_id": "my-project",
  "mode": "coding"
}
```

Output:
```json
{
  "user_memory": "...",
  "project_memory": "...",
  "recent_sessions": ["..."],
  "relevant_memories": ["..."]
}
```

### `search_memory`

Busca semântica por significado.

Input:
```json
{
  "query": "como autenticar usuários",
  "scope": "project/my-project",
  "limit": 5
}
```

Output:
```json
{
  "results": [
    {
      "id": "mem_abc123",
      "title": "Autenticação JWT",
      "score": 0.91,
      "path": "vault/Knowledge/auth.md"
    }
  ]
}
```

### `save_memory`

Cria uma nova memória.

Input:
```json
{
  "title": "Decisão: usar SQLite local",
  "content": "...",
  "type": "project",
  "scope": "project/my-project",
  "tags": ["database", "architecture"]
}
```

### `update_memory`

Atualiza uma memória existente.

Input:
```json
{
  "id": "mem_abc123",
  "content": "...",
  "append": false
}
```

### `delete_memory`

Remove uma memória e seu embedding.

### `log_session`

Registra o log bruto de uma sessão para destilação futura.

Input:
```json
{
  "session_id": "sess_xyz789",
  "project_id": "my-project",
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

## ADDED

- `McpServer` com suporte a stdio.
- Definição de tools e schemas de entrada/saída.
- Adapter `McpToMemoryAdapter` que traduz chamadas MCP para o domínio.

## MODIFIED

N/A.

## REMOVED

N/A.
