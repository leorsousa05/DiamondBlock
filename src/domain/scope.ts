import type { MemoryType } from './memory.js';
import { basename } from 'node:path';

export type ScopePrefix = 'user' | 'global' | 'project';

export interface ScopeInfo {
  prefix: ScopePrefix;
  projectId?: string;
  raw: string;
}

export class Scope {
  static readonly USER = 'user';
  static readonly GLOBAL = 'global';
  static readonly PROJECT_PREFIX = 'project';

  static normalize(scope: string): string {
    const trimmed = scope.trim().toLowerCase();
    const collapsed = trimmed.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
    return collapsed || Scope.GLOBAL;
  }

  static normalizeProjectId(projectId: string): string {
    const trimmed = projectId.trim();
    const name = trimmed.includes('/') || trimmed.includes('\\') ? basename(trimmed) : trimmed;
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  static fromTypeAndProject(type: MemoryType, projectId?: string): string {
    switch (type) {
      case 'user':
        return Scope.USER;
      case 'knowledge':
        return Scope.GLOBAL;
      case 'project':
      case 'distilled':
        if (!projectId || projectId.trim().length === 0) {
          throw new Error(`Memory type '${type}' requires a projectId`);
        }
        return `${Scope.PROJECT_PREFIX}/${Scope.normalizeProjectId(projectId)}`;
      default:
        throw new Error(`Unknown memory type: ${type}`);
    }
  }

  static parse(scope: string): ScopeInfo {
    const normalized = Scope.normalize(scope);
    const [prefix, ...rest] = normalized.split('/');

    if (prefix === Scope.USER) {
      return { prefix: 'user', raw: scope };
    }

    if (prefix === Scope.GLOBAL) {
      return { prefix: 'global', raw: scope };
    }

    if (prefix === Scope.PROJECT_PREFIX) {
      return {
        prefix: 'project',
        projectId: rest.join('/') || undefined,
        raw: scope,
      };
    }

    return { prefix: 'global', raw: scope };
  }

  static isProject(scope: string): boolean {
    return Scope.parse(scope).prefix === 'project';
  }

  static projectIdFromScope(scope: string): string | undefined {
    return Scope.parse(scope).projectId;
  }
}
