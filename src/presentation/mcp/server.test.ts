import { describe, it, expect } from 'vitest';
import {
  resolveSearchScope,
  searchMemoryInputSchema,
  saveMemoryInputSchema,
  updateMemoryInputSchema,
  indexCodebaseInputSchema,
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

  describe('indexCodebaseInputSchema', () => {
    it('accepts empty input', () => {
      const input = indexCodebaseInputSchema.parse({});
      expect(input.project_id).toBeUndefined();
      expect(input.path).toBeUndefined();
      expect(input.force).toBeUndefined();
      expect(input.dry_run).toBeUndefined();
    });

    it('accepts all options', () => {
      const input = indexCodebaseInputSchema.parse({
        project_id: 'my-app',
        path: '/tmp/project',
        force: true,
        dry_run: true,
      });
      expect(input.project_id).toBe('my-app');
      expect(input.path).toBe('/tmp/project');
      expect(input.force).toBe(true);
      expect(input.dry_run).toBe(true);
    });
  });
});
