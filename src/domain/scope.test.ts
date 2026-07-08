import { describe, it, expect } from 'vitest';
import { Scope } from './scope.js';

describe('Scope', () => {
  describe('normalize', () => {
    it('trims whitespace and lowercases', () => {
      expect(Scope.normalize('  Project/My-App  ')).toBe('project/my-app');
    });

    it('collapses multiple slashes', () => {
      expect(Scope.normalize('project//my-app/')).toBe('project/my-app');
    });

    it('removes leading and trailing slashes', () => {
      expect(Scope.normalize('/project/my-app/')).toBe('project/my-app');
    });

    it('falls back to global for empty string', () => {
      expect(Scope.normalize('   ')).toBe('global');
    });
  });

  describe('fromTypeAndProject', () => {
    it('returns user scope for user memories', () => {
      expect(Scope.fromTypeAndProject('user')).toBe('user');
    });

    it('returns global scope for knowledge memories', () => {
      expect(Scope.fromTypeAndProject('knowledge')).toBe('global');
    });

    it('returns project scope for project memories with kebab-case normalization', () => {
      expect(Scope.fromTypeAndProject('project', 'My App')).toBe('project/my-app');
    });

    it('returns project scope for distilled memories', () => {
      expect(Scope.fromTypeAndProject('distilled', 'my-app')).toBe('project/my-app');
    });

    it('normalizes project ids with paths by basename', () => {
      expect(Scope.fromTypeAndProject('project', '/some/path/My-App')).toBe('project/my-app');
    });

    it('throws when project/distilled lacks projectId', () => {
      expect(() => Scope.fromTypeAndProject('project')).toThrow(/requires a projectId/);
      expect(() => Scope.fromTypeAndProject('distilled', '  ')).toThrow(/requires a projectId/);
    });
  });

  describe('parse', () => {
    it('parses user scope', () => {
      expect(Scope.parse('user')).toEqual({ prefix: 'user', raw: 'user' });
    });

    it('parses global scope', () => {
      expect(Scope.parse('global')).toEqual({ prefix: 'global', raw: 'global' });
    });

    it('parses project scope with id', () => {
      expect(Scope.parse('project/my-app')).toEqual({
        prefix: 'project',
        projectId: 'my-app',
        raw: 'project/my-app',
      });
    });

    it('treats unknown prefixes as global', () => {
      expect(Scope.parse('foobar')).toEqual({ prefix: 'global', raw: 'foobar' });
    });
  });

  describe('isProject', () => {
    it('returns true for project scopes', () => {
      expect(Scope.isProject('project/my-app')).toBe(true);
    });

    it('returns false for non-project scopes', () => {
      expect(Scope.isProject('user')).toBe(false);
      expect(Scope.isProject('global')).toBe(false);
    });
  });

  describe('projectIdFromScope', () => {
    it('extracts project id', () => {
      expect(Scope.projectIdFromScope('project/my-app')).toBe('my-app');
    });

    it('returns undefined for non-project scopes', () => {
      expect(Scope.projectIdFromScope('user')).toBeUndefined();
    });
  });
});
