import type { MemoryRepository } from '../ports/memory_repository.js';
import type { SessionRepository } from '../ports/session_repository.js';
export interface GetContextInput {
    sessionId: string;
    projectId: string;
    mode?: string;
}
export interface GetContextOutput {
    user_memory: string;
    project_memory: string;
    global_memory: string;
    code_context: string;
    recent_sessions: string[];
    relevant_memories: string[];
}
export declare class GetContextUseCase {
    private readonly memoryRepository;
    private readonly sessionRepository;
    constructor(memoryRepository: MemoryRepository, sessionRepository: SessionRepository);
    execute(input: GetContextInput): Promise<GetContextOutput>;
    private findUserMemory;
    private findProjectMemory;
    private findGlobalMemories;
    private findRelevantMemories;
    private findCodeMemories;
}
//# sourceMappingURL=get_context.d.ts.map