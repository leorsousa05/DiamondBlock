import { describe, it, expect } from 'vitest';
import { createMemory } from '../domain/memory.js';
import { LocalEnrichmentProvider } from './local_enrichment_provider.js';

describe('LocalEnrichmentProvider', () => {
  const provider = new LocalEnrichmentProvider();

  it('extracts tags from title and content', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Configuring PostgreSQL with Docker',
      content: 'We containerized the PostgreSQL database using Docker Compose for local development.',
    });

    const result = await provider.enrich(memory);

    expect(result.tags).toContain('postgresql');
    expect(result.tags).toContain('docker');
  });

  it('filters stop-words', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'The and of in',
      content: 'This is a very basic content with only stop words and nothing else.',
    });

    const result = await provider.enrich(memory);

    expect(result.tags).not.toContain('the');
    expect(result.tags).not.toContain('and');
    expect(result.tags).not.toContain('of');
  });

  it('extracts camelCase and PascalCase identifiers', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Refactoring UserSessionManager',
      content: 'We renamed userSessionStore to UserSessionManager and added createUserProfile.',
    });

    const result = await provider.enrich(memory);

    expect(result.entities).toContain('UserSessionManager');
    expect(result.entities).toContain('userSessionStore');
    expect(result.entities).toContain('createUserProfile');
  });

  it('detects known technology terms', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Using React with TypeScript',
      content: 'The frontend is built with React and TypeScript.',
    });

    const result = await provider.enrich(memory);

    expect(result.tags).toContain('react');
    expect(result.tags).toContain('typescript');
  });

  it('generates a summary from the first sentence', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Deployment pipeline',
      content: 'We automated the deployment pipeline using GitHub Actions. It runs tests and builds the project on every push.',
    });

    const result = await provider.enrich(memory);

    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.endsWith('...') || result.summary.endsWith('.') || result.summary.endsWith('!') || result.summary.endsWith('?')).toBe(true);
  });

  it('returns zero confidence for very short content', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Hi',
      content: 'Hello world',
    });

    const result = await provider.enrich(memory);

    expect(result.confidence).toBe(0);
  });

  it('returns bounded arrays', async () => {
    const memory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Tech stack',
      content: [
        'react vue angular svelte solid nextjs nuxt remix',
        'nodejs deno bun express fastify nestjs hono',
        'tailwind bootstrap sass css html wasm webgl',
      ].join(' '),
    });

    const result = await provider.enrich(memory);

    expect(result.tags.length).toBeLessThanOrEqual(10);
    expect(result.entities.length).toBeLessThanOrEqual(10);
  });
});
