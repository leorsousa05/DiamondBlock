export class ContextBuilder {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async build(input) {
        const [userMemory, projectMemory, globalMemories, recentSessions, relevantMemories,] = await Promise.all([
            this.deps.findUserMemory(),
            this.deps.findProjectMemory(input.projectId),
            this.deps.findGlobalMemories(2),
            this.deps.findRecentSessions(input.projectId, input.recentSessionCount ?? 3),
            this.deps.findRelevantMemories(input.projectId, input.mode, input.relevantMemoryCount ?? 5),
        ]);
        return {
            userMemory: this.renderMemory(userMemory, 'No user memory yet.'),
            projectMemory: this.renderMemory(projectMemory, 'No project memory yet.'),
            globalMemory: this.renderGlobalMemories(globalMemories),
            recentSessions: recentSessions.map((s) => this.renderSession(s)),
            relevantMemories: relevantMemories.map((m) => this.renderMemory(m, '')),
        };
    }
    renderMemory(memory, fallback) {
        if (!memory)
            return fallback;
        return `# ${memory.title}\n\n${memory.content}`;
    }
    renderGlobalMemories(memories) {
        if (memories.length === 0)
            return 'No global memory yet.';
        return memories.map((m) => this.renderMemory(m, '')).join('\n\n');
    }
    renderSession(session) {
        const header = `## Session ${session.id} (${session.createdAt.toISOString()})`;
        const body = session.messages
            .slice(-10)
            .map((m) => `**${m.role}**: ${m.content}`)
            .join('\n\n');
        return `${header}\n\n${body}`;
    }
}
//# sourceMappingURL=context_builder.js.map