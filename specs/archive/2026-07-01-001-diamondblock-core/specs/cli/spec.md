# Spec: CLI

## Overview

A CLI é a interface humana inicial do DiamondBlock. Ela permite inicializar o vault, gerenciar memórias, buscar por significado, visualizar sessões e executar manutenção periódica.

## Commands

### `diamondblock init [path]`

Inicializa um novo vault DiamondBlock. Se `path` omitido, usa `~/.diamondblock`.

### `diamondblock memory list [--scope <scope>] [--limit <n>]`

Lista memórias com output rico (tabela colorida).

### `diamondblock memory search <query> [--scope <scope>] [--limit <n>]`

Busca semântica e exibe resultados com score.

### `diamondblock memory add --title <title> [--type <type>] [--scope <scope>]`

Cria nova memória. Pode abrir editor padrão do sistema para conteúdo.

### `diamondblock memory show <id>`

Exibe uma memória formatada no terminal.

### `diamondblock memory edit <id>`

Abre memória no editor padrão.

### `diamondblock memory delete <id>`

Remove memória após confirmação.

### `diamondblock session list [--limit <n>]`

Lista sessões recentes.

### `diamondblock session show <session-id>`

Exibe log bruto de uma sessão.

### `diamondblock distill [--dry-run]`

Executa distilação manual de logs em memórias curadas.

### `diamondblock status`

Exibe estatísticas do vault: número de memórias, sessões, tamanho do índice, última distilação.

## ADDED

- CLI baseada em `commander` ou `clipanion`.
- Output rico via `chalk`, `cli-table3`, `ora`.
- Adapter `CliToMemoryAdapter`.

## MODIFIED

N/A.

## REMOVED

N/A.
