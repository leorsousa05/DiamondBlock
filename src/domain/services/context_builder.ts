import type { Memory } from '../memory.js';
import type { Session } from '../session.js';

export interface ContextInput {
  sessionId: string;
  projectId: string;
  mode?: string;
  recentSessionCount?: number;
  relevantMemoryCount?: number;
}

export interface ContextOutput {
  userMemory: string;
  projectMemory: string;
  recentSessions: string[];
  relevantMemories: string[];
}

export interface ContextBuilderDependencies {
  findUserMemory(): Promise<Memory | null>;
  findProjectMemory(projectId: string): Promise<Memory | null>;
  findRecentSessions(projectId: string, limit: number): Promise<Session[]>;
  findRelevantMemories(projectId: string, mode?: string, limit?: number): Promise<Memory[]>;
}

export class ContextBuilder {
  constructor(private readonly deps: ContextBuilderDependencies) {}

  async build(input: ContextInput): Promise<ContextOutput> {
    const [
      userMemory,
      projectMemory,
      recentSessions,
      relevantMemories,
    ] = await Promise.all([
      this.deps.findUserMemory(),
      this.deps.findProjectMemory(input.projectId),
      this.deps.findRecentSessions(input.projectId, input.recentSessionCount ?? 3),
      this.deps.findRelevantMemories(input.projectId, input.mode, input.relevantMemoryCount ?? 5),
    ]);

    return {
      userMemory: this.renderMemory(userMemory, 'No user memory yet.'),
      projectMemory: this.renderMemory(projectMemory, 'No project memory yet.'),
      recentSessions: recentSessions.map((s) => this.renderSession(s)),
      relevantMemories: relevantMemories.map((m) => this.renderMemory(m, '')),
    };
  }

  private renderMemory(memory: Memory | null, fallback: string): string {
    if (!memory) return fallback;
    return `# ${memory.title}\n\n${memory.content}`;
  }

  private renderSession(session: Session): string {
    const header = `## Session ${session.id} (${session.createdAt.toISOString()})`;
    const body = session.messages
      .slice(-10)
      .map((m) => `**${m.role}**: ${m.content}`)
      .join('\n\n');
    return `${header}\n\n${body}`;
  }
}
