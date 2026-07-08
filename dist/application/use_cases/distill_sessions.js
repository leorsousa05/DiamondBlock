import { Distiller } from '../../domain/services/distiller.js';
export class DistillSessionsUseCase {
    memoryRepository;
    sessionRepository;
    constructor(memoryRepository, sessionRepository) {
        this.memoryRepository = memoryRepository;
        this.sessionRepository = sessionRepository;
    }
    async execute(input = {}) {
        const repo = this.sessionRepository;
        const distiller = new Distiller({
            findUnprocessedSessions: (limit) => repo.listUnprocessed(limit),
            saveMemory: (memory) => this.memoryRepository.save(memory),
            markSessionProcessed: (sessionId) => repo.markProcessed(sessionId),
        });
        return distiller.distill({ dryRun: input.dryRun, limit: input.limit });
    }
}
//# sourceMappingURL=distill_sessions.js.map