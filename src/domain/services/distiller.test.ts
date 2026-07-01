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
});
