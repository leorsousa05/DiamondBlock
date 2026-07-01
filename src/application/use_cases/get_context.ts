import type { Memory } from '../../domain/memory.js';
import type { Session } from '../../domain/session.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { SessionRepository } from '../ports/session_repository.js';
import { ContextBuilder } from '../../domain/services/context_builder.js';

export interface GetContextInput {
  sessionId: string;
  projectId: string;
  mode?: string;
}

export interface GetContextOutput {
  user_memory: string;
  project_memory: string;
  recent_sessions: string[];
  relevant_memories: string[];
}

export class GetContextUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly sessionRepository: SessionRepository
  ) {}

  async execute(input: GetContextInput): Promise<GetContextOutput> {
    const builder = new ContextBuilder({
      findUserMemory: () => this.findUserMemory(),
      findProjectMemory: (projectId) => this.findProjectMemory(projectId),
      findRecentSessions: (projectId, limit) => this.sessionRepository.listRecent(limit, projectId),
      findRelevantMemories: (projectId, mode, limit) => this.findRelevantMemories(projectId, mode, limit),
    });

    const result = await builder.build({
      sessionId: input.sessionId,
      projectId: input.projectId,
      mode: input.mode,
      recentSessionCount: 3,
      relevantMemoryCount: 5,
    });

    return {
      user_memory: result.userMemory,
      project_memory: result.projectMemory,
      recent_sessions: result.recentSessions,
      relevant_memories: result.relevantMemories,
    };
  }

  private async findUserMemory(): Promise<Memory | null> {
    const memories = await this.memoryRepository.list({ type: 'user', limit: 1 });
    return memories[0] ?? null;
  }

  private async findProjectMemory(projectId: string): Promise<Memory | null> {
    const memories = await this.memoryRepository.search({
      type: 'project',
      scope: `project/${projectId}`,
      limit: 1,
    });
    return memories[0] ?? null;
  }

  private async findRelevantMemories(
    projectId: string,
    mode?: string,
    limit = 5
  ): Promise<Memory[]> {
    const query = mode ? `project ${projectId} ${mode}` : `project ${projectId}`;
    return this.memoryRepository.search({
      query,
      scope: `project/${projectId}`,
      limit,
    });
  }
}
