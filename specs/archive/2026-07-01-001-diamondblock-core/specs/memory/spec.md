# Spec: Memory System

## Overview

O sistema de memória é o coração do DiamondBlock. Ele armazena três camadas de memória:

- **User memory**: preferências, estilo de comunicação, regras pessoais, conhecimento duradouro do usuário.
- **Project memory**: decisões arquiteturais, specs, dependências, APIs, padrões de projeto.
- **Session memory**: logs brutos de conversas entre agente e usuário, organizados por data/hora.

## Storage Layout

O vault DiamondBlock reside em `~/.diamondblock/` por padrão, configurável via `DB_HOME`.

```
~/.diamondblock/
├── .diamondblock.yml          # config global
├── index/
│   └── embeddings.sqlite      # índice vetorial local
└── vault/
    ├── Memory/
    │   ├── user/              # memórias de usuário
    │   │   └── <memory-id>.md
    │   ├── project/           # memórias de projeto
    │   │   └── <project-id>/
    │   │       └── <memory-id>.md
    │   ├── knowledge/         # conhecimento geral
    │   │   └── <memory-id>.md
    │   └── distilled/         # memórias destiladas de sessões
    │       └── <memory-id>.md
    ├── Sessions/
    │   └── <session-id>.md
    └── Journal/
        └── <period>.md
```

Cada memória vive em seu próprio arquivo Markdown. O nome do arquivo é o `id` da memória. Subdiretórios organizam memórias por `type` e, para projetos, por `scope`.

## Memory File Format

Cada memória é um arquivo Markdown com YAML frontmatter:

```yaml
---
id: mem_abc123
type: user | project | knowledge | distilled
scope: user | project/<id> | global
created_at: 2026-07-01T18:27:00Z
updated_at: 2026-07-01T18:27:00Z
source: manual | session:<session-id> | distill
tags:
  - typescript
  - architecture
  - preferences
confidence: 0.92
---

# Título da memória

Conteúdo livre em Markdown. Pode conter seções, listas, blocos de código, links internos.
```

## ADDED

- Modelo de domínio `Memory`, `Session`, `UserProfile`, `ProjectProfile`.
- Repositório `MemoryRepository` para persistência em arquivo.
- Repositório `VectorRepository` para índice vetorial.
- Agente `Distiller` para consolidar sessões em memórias.

## MODIFIED

- Layout de armazenamento de memória: de arquivo único por escopo para um arquivo Markdown por memória, organizado em subdiretórios por tipo.

## REMOVED

N/A.
