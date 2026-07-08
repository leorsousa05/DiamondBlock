import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './context_builder.js';
import { createMemory } from '../memory.js';
import { createSession } from '../session.js';

describe('ContextBuilder', () => {
  it('builds context from dependencies', async () => {
    const userMemory = createMemory({
      type: 'user',
      scope: 'user',
      title: 'User Preferences',
      content: 'Prefer TypeScript.',
    });

    const projectMemory = createMemory({
      type: 'project',
      scope: 'project/demo',
      title: 'Demo Project',
      content: 'Use SQLite.',
    });

    const session = createSession({
      projectId: 'demo',
      messages: [{ role: 'user', content: 'Hello', timestamp: new Date() }],
    });

    const globalMemory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Global Knowledge',
      content: 'Use semantic versioning.',
    });

    const builder = new ContextBuilder({
      findUserMemory: async () => userMemory,
      findProjectMemory: async () => projectMemory,
      findGlobalMemories: async () => [globalMemory],
      findRecentSessions: async () => [session],
      findRelevantMemories: async () => [projectMemory],
      findCodeMemories: async () => [],
    });

    const context = await builder.build({
      sessionId: 'sess_1',
      projectId: 'demo',
    });

    expect(context.userMemory).toContain('User Preferences');
    expect(context.projectMemory).toContain('Demo Project');
    expect(context.globalMemory).toContain('Global Knowledge');
    expect(context.recentSessions.length).toBe(1);
    expect(context.relevantMemories.length).toBe(1);
    expect(context.codeContext).toBe('No indexed code context yet.');
  });

  it('falls back when memory is missing', async () => {
    const builder = new ContextBuilder({
      findUserMemory: async () => null,
      findProjectMemory: async () => null,
      findGlobalMemories: async () => [],
      findRecentSessions: async () => [],
      findRelevantMemories: async () => [],
      findCodeMemories: async () => [],
    });

    const context = await builder.build({
      sessionId: 'sess_1',
      projectId: 'demo',
    });

    expect(context.userMemory).toBe('No user memory yet.');
    expect(context.projectMemory).toBe('No project memory yet.');
    expect(context.globalMemory).toBe('No global memory yet.');
    expect(context.codeContext).toBe('No indexed code context yet.');
  });
});
