import { createSession } from '../../domain/session.js';
export class LogSessionUseCase {
    sessionRepository;
    constructor(sessionRepository) {
        this.sessionRepository = sessionRepository;
    }
    async execute(input) {
        const session = createSession({
            projectId: input.projectId,
            messages: input.messages,
        }, input.sessionId);
        await this.sessionRepository.save(session);
    }
}
//# sourceMappingURL=log_session.js.map