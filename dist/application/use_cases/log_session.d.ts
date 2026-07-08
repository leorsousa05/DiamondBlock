import { type SessionMessage } from '../../domain/session.js';
import type { SessionRepository } from '../ports/session_repository.js';
export interface LogSessionInput {
    sessionId: string;
    projectId: string;
    messages: SessionMessage[];
}
export declare class LogSessionUseCase {
    private readonly sessionRepository;
    constructor(sessionRepository: SessionRepository);
    execute(input: LogSessionInput): Promise<void>;
}
//# sourceMappingURL=log_session.d.ts.map