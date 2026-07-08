import type { Session } from '../../domain/session.js';
import type { SessionRepository } from '../ports/session_repository.js';
export interface ListSessionsInput {
    limit?: number;
    projectId?: string;
}
export declare class ListSessionsUseCase {
    private readonly sessionRepository;
    constructor(sessionRepository: SessionRepository);
    execute(input?: ListSessionsInput): Promise<Session[]>;
}
//# sourceMappingURL=list_sessions.d.ts.map