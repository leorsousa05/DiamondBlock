import type { MemoryRepository } from '../ports/memory_repository.js';
import type { SessionRepository } from '../ports/session_repository.js';
export interface DistillSessionsInput {
    dryRun?: boolean;
    limit?: number;
}
export interface DistillSessionsOutput {
    processed: number;
    memoriesCreated: number;
}
export declare class DistillSessionsUseCase {
    private readonly memoryRepository;
    private readonly sessionRepository;
    constructor(memoryRepository: MemoryRepository, sessionRepository: SessionRepository);
    execute(input?: DistillSessionsInput): Promise<DistillSessionsOutput>;
}
//# sourceMappingURL=distill_sessions.d.ts.map