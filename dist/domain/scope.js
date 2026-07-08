import { basename } from 'node:path';
export class Scope {
    static USER = 'user';
    static GLOBAL = 'global';
    static PROJECT_PREFIX = 'project';
    static normalize(scope) {
        const trimmed = scope.trim().toLowerCase();
        const collapsed = trimmed.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
        return collapsed || Scope.GLOBAL;
    }
    static normalizeProjectId(projectId) {
        const trimmed = projectId.trim();
        const name = trimmed.includes('/') || trimmed.includes('\\') ? basename(trimmed) : trimmed;
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');
    }
    static fromTypeAndProject(type, projectId) {
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
    static parse(scope) {
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
    static isProject(scope) {
        return Scope.parse(scope).prefix === 'project';
    }
    static projectIdFromScope(scope) {
        return Scope.parse(scope).projectId;
    }
}
//# sourceMappingURL=scope.js.map