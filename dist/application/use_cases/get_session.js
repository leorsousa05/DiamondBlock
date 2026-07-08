export class GetSessionUseCase {
    sessionRepository;
    constructor(sessionRepository) {
        this.sessionRepository = sessionRepository;
    }
    async execute(id) {
        return this.sessionRepository.findById(id);
    }
}
//# sourceMappingURL=get_session.js.map