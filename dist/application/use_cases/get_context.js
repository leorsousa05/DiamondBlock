import { ContextBuilder } from '../../domain/services/context_builder.js';
export class GetContextUseCase {
    memoryRepository;
    sessionRepository;
    constructor(memoryRepository, sessionRepository) {
        this.memoryRepository = memoryRepository;
        this.sessionRepository = sessionRepository;
    }
    async execute(input) {
        const builder = new ContextBuilder({
            findUserMemory: () => this.findUserMemory(),
            findProjectMemory: (projectId) => this.findProjectMemory(projectId),
            findGlobalMemories: (limit) => this.findGlobalMemories(limit),
            findRecentSessions: (projectId, limit) => this.sessionRepository.listRecent(limit, projectId),
            findRelevantMemories: (projectId, mode, limit) => this.findRelevantMemories(projectId, mode, limit),
            findCodeMemories: (projectId, mode, limit) => this.findCodeMemories(projectId, mode, limit),
        });
        const result = await builder.build({
            sessionId: input.sessionId,
            projectId: input.projectId,
            mode: input.mode,
            recentSessionCount: 3,
            relevantMemoryCount: 5,
            codeContextCount: 5,
        });
        return {
            user_memory: result.userMemory,
            project_memory: result.projectMemory,
            global_memory: result.globalMemory,
            code_context: result.codeContext,
            recent_sessions: result.recentSessions,
            relevant_memories: result.relevantMemories,
        };
    }
    async findUserMemory() {
        const memories = await this.memoryRepository.list({ type: 'user', scope: 'user', limit: 1 });
        return memories[0] ?? null;
    }
    async findProjectMemory(projectId) {
        const memories = await this.memoryRepository.search({
            type: 'project',
            scope: `project/${projectId}`,
            limit: 1,
        });
        return memories[0] ?? null;
    }
    async findGlobalMemories(limit) {
        return this.memoryRepository.search({
            type: 'knowledge',
            scope: 'global',
            limit,
        });
    }
    async findRelevantMemories(projectId, mode, limit = 5) {
        const query = mode ? `project ${projectId} ${mode}` : `project ${projectId}`;
        const [projectResults, globalResults] = await Promise.all([
            this.memoryRepository.searchWithScore({
                query,
                scope: `project/${projectId}`,
                limit,
            }),
            this.memoryRepository.searchWithScore({
                query,
                scope: 'global',
                limit,
            }),
        ]);
        const merged = [...projectResults, ...globalResults].sort((a, b) => b.score - a.score);
        return merged.slice(0, limit).map((r) => r.memory);
    }
    async findCodeMemories(projectId, mode, limit = 5) {
        const query = mode ? `code ${projectId} ${mode}` : `code ${projectId}`;
        const results = await this.memoryRepository.searchWithScore({
            query,
            scope: `project/${projectId}`,
            limit,
        });
        return results
            .filter((r) => r.memory.source === 'codebase-indexer' || r.memory.tags.includes('code'))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.memory);
    }
}
//# sourceMappingURL=get_context.js.map