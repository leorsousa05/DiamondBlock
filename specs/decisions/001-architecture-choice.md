# ADR 001: Arquitetura Modular Monolith com Clean Architecture

## Status

Accepted

## Context

DiamondBlock é um produto novo que precisa servir tanto agents de IA (via MCP) quanto humanos (via CLI), com possibilidade futura de UI web/desktop. Precisamos de uma arquitetura que minimize o custo de evolução e permita trocar interfaces e infraestrutura sem reescrever regras de negócio.

## Decision

Adotar **Modular Monolith** com princípios de **Clean Architecture / Hexagonal**:

- Domínio central independente.
- Ports abstratas para persistência, embeddings e configuração.
- Adapters concretos para filesystem, SQLite, MCP, CLI.

## Consequences

### Positives

- Facilidade para adicionar novas interfaces (web, desktop, HTTP/SSE).
- Testabilidade alta: domínio puro, adapters mockáveis.
- Clareza de dependências.

### Negatives

- Overhead inicial de abstração.
- Curva de aprendizado para novos contribuidores.

## Alternatives Considered

- **Microsserviços**: overkill para produto local single-user.
- **Arquitetura em camadas tradicional**: acoplamento entre UI e persistência dificultaria evolução.
