# Proposal: DiamondBlock Core

## WHY

DiamondBlock nasce da constatação de que agentes de IA esquecem tudo entre sessões. Usuários avançados hoje mantêm arquivos `MEMORY.md`, scripts caseiros, plugins frágeis e fluxos manuais de cópia de chat para contornar essa amnésia. O resultado é perda de contexto, documentação desatualizada, configuração excessiva e histórico fragmentado.

DiamondBlock propõe uma solução local-first, privada e nativamente projetada para memória de agentes: um servidor MCP que expõe memória persistente e semântica para coding agents, acessível também por uma CLI rica para humanos.

## Scope

Esta spec cobre a fundação do produto:

- Estrutura de armazenamento local em Markdown + frontmatter.
- Índice vetorial local para busca semântica.
- Servidor MCP via stdio com tools essenciais.
- CLI para inicialização, busca, visualização e manutenção de memórias.
- Agente local de distilação periódica (heartbeat).
- Integração inicial com Kimi Code.

## Constraints

- Node.js / TypeScript.
- 100% local e privado por padrão.
- Formato legível por humanos como fonte da verdade.
- Embeddings locais por padrão, API externa opcional.
- stdio para transporte MCP.

## Success Criteria

- Kimi Code conecta-se ao DiamondBlock e recupera contexto de memória no início da sessão.
- Usuário consegue inicializar um vault, adicionar memórias, buscar por significado e visualizar sessões pela CLI.
- Logs de sessão são salvos automaticamente e destilados em memórias curadas.
