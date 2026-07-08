export class ListSessionsUseCase {
    sessionRepository;
    constructor(sessionRepository) {
        this.sessionRepository = sessionRepository;
    }
    async execute(input = {}) {
        return this.sessionRepository.listRecent(input.limit ?? 20, input.projectId);
    }
}
//# sourceMappingURL=list_sessions.js.map