import { vi } from 'vitest';
export function createMockContainer() {
    return {
        memoryRepository: {
            list: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            search: vi.fn().mockResolvedValue([]),
            resolvePath: vi.fn((memory) => `/vault/Memory/${memory.id}.md`),
        },
        sessionRepository: {
            listRecent: vi.fn().mockResolvedValue([]),
            findById: vi.fn().mockResolvedValue(null),
            save: vi.fn().mockResolvedValue(undefined),
        },
        vectorIndex: {
            index: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
            search: vi.fn().mockResolvedValue([]),
        },
        embeddingProvider: {
            embed: vi.fn().mockResolvedValue([]),
            isAvailable: vi.fn().mockResolvedValue(false),
        },
        configStore: {
            load: vi.fn().mockResolvedValue({}),
            save: vi.fn().mockResolvedValue(undefined),
        },
        enrichmentService: {
            enrich: vi.fn().mockResolvedValue(undefined),
        },
    };
}
//# sourceMappingURL=test_helpers.js.map