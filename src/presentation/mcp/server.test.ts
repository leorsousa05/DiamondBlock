import { describe, it, expect } from 'vitest';
import {
  resolveSearchScope,
  searchMemoryInputSchema,
  saveMemoryInputSchema,
  updateMemoryInputSchema,
} from './server.js';

describe('MCP server schemas', () => {
  describe('resolveSearchScope', () => {
    it('normalizes an explicit scope', () => {
      expect(resolveSearchScope({ scope: '  Project//My-App  ' })).toBe('project/my-app');
    });

    it('derives project scope from project_id when scope is omitted', () => {
      expect(resolveSearchScope({ project_id: 'MyApp' })).toBe('project/myapp');
    });

    it('prefers scope over project_id', () => {
      expect(resolveSearchScope({ scope: 'global', project_id: 'MyApp' })).toBe('global');
    });

    it('returns undefined when neither scope nor project_id is provided', () => {
      expect(resolveSearchScope({})).toBeUndefined();
    });
  });

  describe('searchMemoryInputSchema', () => {
    it('accepts query with optional project_id', () => {
      const input = searchMemoryInputSchema.parse({
        query: 'auth flow',
        project_id: 'my-app',
        limit: 10,
      });
      expect(input.project_id).toBe('my-app');
      expect(input.scope).toBeUndefined();
    });

    it('accepts query with optional scope', () => {
      const input = searchMemoryInputSchema.parse({
        query: 'auth flow',
        scope: 'project/my-app',
      });
      expect(input.scope).toBe('project/my-app');
      expect(input.project_id).toBeUndefined();
    });
  });

  describe('saveMemoryInputSchema', () => {
    it('makes scope optional when project_id is provided', () => {
      const input = saveMemoryInputSchema.parse({
        title: 'Auth flow',
        content: 'Use OAuth2',
        type: 'project',
        project_id: 'my-app',
      });
      expect(input.scope).toBeUndefined();
      expect(input.project_id).toBe('my-app');
    });

    it('still accepts explicit scope', () => {
      const input = saveMemoryInputSchema.parse({
        title: 'Auth flow',
        content: 'Use OAuth2',
        type: 'project',
        scope: 'project/my-app',
      });
      expect(input.scope).toBe('project/my-app');
    });
  });

  describe('updateMemoryInputSchema', () => {
    it('accepts optional project_id', () => {
      const input = updateMemoryInputSchema.parse({
        id: 'mem_abc',
        project_id: 'my-app',
      });
      expect(input.project_id).toBe('my-app');
      expect(input.scope).toBeUndefined();
    });
  });
});
