import { createMemory } from '../memory.js';
export class Distiller {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async distill(options = {}) {
        const sessions = await this.deps.findUnprocessedSessions(options.limit ?? 10);
        let memoriesCreated = 0;
        for (const session of sessions) {
            const memory = this.extractMemory(session);
            if (memory) {
                if (!options.dryRun) {
                    await this.deps.saveMemory(memory);
                    await this.deps.markSessionProcessed(session.id);
                }
                memoriesCreated++;
            }
        }
        return {
            processed: sessions.length,
            memoriesCreated,
        };
    }
    extractMemory(session) {
        if (session.messages.length === 0)
            return null;
        const summary = this.summarize(session);
        const input = {
            type: 'distilled',
            scope: `project/${session.projectId}`,
            title: `Distilled session ${session.id}`,
            content: summary,
            source: `session:${session.id}`,
            tags: ['distilled', 'session'],
            confidence: 0.8,
        };
        return createMemory(input);
    }
    summarize(session) {
        const topics = this.extractTopics(session);
        const decisions = this.extractDecisions(session);
        return [
            `Project: ${session.projectId}`,
            `Date: ${session.createdAt.toISOString()}`,
            '',
            '## Topics',
            topics.length > 0 ? topics.map((t) => `- ${t}`).join('\n') : '- General discussion',
            '',
            '## Decisions / Outcomes',
            decisions.length > 0 ? decisions.map((d) => `- ${d}`).join('\n') : '- No explicit decisions recorded',
        ].join('\n');
    }
    extractTopics(session) {
        const text = session.messages.map((m) => m.content).join(' ');
        const codeBlockMatches = text.match(/```[\s\S]*?```/g);
        const technologies = new Set();
        const patterns = [
            /\b(TypeScript|JavaScript|Python|Rust|Go|Node\.js|React|Next\.js|Vue|Angular|Docker|Kubernetes|PostgreSQL|MongoDB|Redis|SQLite)\b/gi,
            /\b(Claude|GPT|OpenAI|Anthropic|MCP|LLM|agent|embedding|vector)\b/gi,
        ];
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    technologies.add(match.toLowerCase());
                }
            }
        }
        if (codeBlockMatches) {
            technologies.add('code examples');
        }
        return Array.from(technologies).slice(0, 8);
    }
    extractDecisions(session) {
        const decisions = [];
        const decisionPatterns = [
            /\b(decidimos|decided|vamos|we will|let's|let us|vamos usar|going to use)\b/gi,
            /\b(escolhemos|chose|chosen|optamos|opted for)\b/gi,
        ];
        for (const message of session.messages) {
            for (const pattern of decisionPatterns) {
                if (pattern.test(message.content)) {
                    const sentence = message.content
                        .split(/[.!?\n]/)
                        .find((s) => pattern.test(s));
                    if (sentence) {
                        decisions.push(sentence.trim());
                    }
                }
            }
        }
        return decisions.slice(0, 5);
    }
}
//# sourceMappingURL=distiller.js.map