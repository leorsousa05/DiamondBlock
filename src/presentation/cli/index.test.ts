import { describe, expect, it } from 'vitest';
import { resolveAddMemoryType, resolveAddMemoryScope } from './index.js';

describe('CLI memory add scope resolution', () => {
  describe('resolveAddMemoryType', () => {
    it('defaults to project type when --project is provided without --type', () => {
      expect(resolveAddMemoryType({ project: 'diamondblock' })).toBe('project');
    });

    it('defaults to knowledge type when neither --project nor --type are provided', () => {
      expect(resolveAddMemoryType({})).toBe('knowledge');
    });

    it('respects explicit --type when --project is omitted', () => {
      expect(resolveAddMemoryType({ type: 'user' })).toBe('user');
    });

    it('respects explicit --type even when --project is provided', () => {
      expect(resolveAddMemoryType({ type: 'distilled', project: 'diamondblock' })).toBe('distilled');
    });
  });

  describe('resolveAddMemoryScope', () => {
    it('creates project scope when --project is provided and type defaults to project', async () => {
      const result = await resolveAddMemoryScope('project', { project: 'diamondblock' }, async () => ({
        projectId: 'fallback',
        source: 'git',
      }));

      expect(result.scope).toBe('project/diamondblock');
      expect(result.projectId).toBe('diamondblock');
    });

    it('still defaults to global scope when no project is provided', async () => {
      const result = await resolveAddMemoryScope('knowledge', {}, async () => ({
        projectId: 'diamondblock',
        source: 'git',
      }));

      expect(result.scope).toBe('global');
    });

    it('creates user scope when --type user is explicit', async () => {
      const result = await resolveAddMemoryScope('user', {}, async () => ({
        projectId: 'diamondblock',
        source: 'git',
      }));

      expect(result.scope).toBe('user');
    });

    it('creates project scope when --type project and --project are explicit', async () => {
      const result = await resolveAddMemoryScope('project', { project: 'My App' }, async () => ({
        projectId: 'fallback',
        source: 'git',
      }));

      expect(result.scope).toBe('project/my-app');
      expect(result.projectId).toBe('my app');
    });

    it('normalizes explicit --scope without resolving project', async () => {
      const result = await resolveAddMemoryScope('knowledge', { scope: 'Project/My-App' }, async () => ({
        projectId: 'fallback',
        source: 'git',
      }));

      expect(result.scope).toBe('project/my-app');
      expect(result.projectId).toBeUndefined();
    });

    it('falls back to detected project when neither --scope nor --project are provided', async () => {
      const result = await resolveAddMemoryScope('project', {}, async () => ({
        projectId: 'detected-project',
        source: 'git',
      }));

      expect(result.scope).toBe('project/detected-project');
      expect(result.projectId).toBe('detected-project');
    });
  });
});
