import { describe, it, expect } from 'vitest';
import { Distiller } from './distiller.js';
import { createSession } from '../session.js';

describe('Distiller', () => {
  it('creates distilled memories from sessions', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'We decided to use TypeScript.', timestamp: new Date() },
        { role: 'assistant', content: 'Great choice.', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];

    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    const result = await distiller.distill({});

    expect(result.processed).toBe(1);
    expect(result.memoriesCreated).toBe(1);
    expect(saved[0]?.type).toBe('distilled');
    expect(saved[0]?.content).toContain('typescript');
  });

  it('skips empty sessions', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [],
    });

    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async () => {},
      markSessionProcessed: async () => {},
    });

    const result = await distiller.distill({});

    expect(result.memoriesCreated).toBe(0);
  });

  it('uses the first user message as the memory title', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'How do we handle authentication in the API?', timestamp: new Date() },
        { role: 'assistant', content: 'We decided to use JWT in httpOnly cookies.', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];
    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    await distiller.distill({});

    expect(saved[0]?.title).toBe('Distilled: How do we handle authentication in the API?');
  });

  it('extracts problems and root causes', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'A busca não funciona depois do deploy.', timestamp: new Date() },
        { role: 'assistant', content: 'O problema era o índice vetorial corrompido. Fixed by reindexing the vault.', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];
    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    await distiller.distill({});

    expect(saved[0]?.content).toContain('## Problems / Root Causes');
    expect(saved[0]?.content).toContain('O problema era o índice vetorial corrompido');
  });

  it('extracts action items and preferences', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'Prefiro não usar OpenAI aqui. Precisamos adicionar testes no parser.', timestamp: new Date() },
        { role: 'assistant', content: 'Próximo passo é cobrir o fallback.', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];
    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    await distiller.distill({});

    expect(saved[0]?.content).toContain('## Preferences / Rejections');
    expect(saved[0]?.content).toContain('Prefiro não usar OpenAI aqui');
    expect(saved[0]?.content).toContain('## Action Items');
    expect(saved[0]?.content).toContain('Precisamos adicionar testes no parser');
    expect(saved[0]?.content).toContain('Próximo passo é cobrir o fallback');
  });

  it('extracts file and symbol references', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'O bug está em src/infrastructure/typescript_parser.ts na função extractRelations().', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];
    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    await distiller.distill({});

    expect(saved[0]?.content).toContain('## References');
    expect(saved[0]?.content).toContain('`src/infrastructure/typescript_parser.ts`');
    expect(saved[0]?.content).toContain('`extractRelations`');
  });

  it('omits empty sections from the distilled content', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'Só um comentário simples sem decisões.', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];
    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    await distiller.distill({});

    expect(saved[0]?.content).not.toContain('## Problems');
    expect(saved[0]?.content).not.toContain('## Action Items');
    expect(saved[0]?.content).not.toContain('## References');
  });

  it('deduplicates repeated sentences across messages', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [
        { role: 'user', content: 'We decided to use TypeScript.', timestamp: new Date() },
        { role: 'assistant', content: 'We decided to use TypeScript.', timestamp: new Date() },
      ],
    });

    const saved: import('../domain/memory.js').Memory[] = [];
    const distiller = new Distiller({
      findUnprocessedSessions: async () => [session],
      saveMemory: async (memory) => saved.push(memory),
      markSessionProcessed: async () => {},
    });

    await distiller.distill({});

    const decisions = saved[0]?.content.match(/We decided to use TypeScript/g) ?? [];
    expect(decisions).toHaveLength(1);
  });
});
