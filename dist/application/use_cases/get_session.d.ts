import type { Session } from '../../domain/session.js';
import type { SessionRepository } from '../ports/session_repository.js';
export declare class GetSessionUseCase {
    private readonly sessionRepository;
    constructor(sessionRepository: SessionRepository);
    execute(id: string): Promise<Session | null>;
}
//# sourceMappingURL=get_session.d.ts.map