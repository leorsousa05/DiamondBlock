import { DistillSessionsUseCase } from '../application/use_cases/distill_sessions.js';
export class Heartbeat {
    memoryRepository;
    sessionRepository;
    options;
    timer = null;
    constructor(memoryRepository, sessionRepository, options) {
        this.memoryRepository = memoryRepository;
        this.sessionRepository = sessionRepository;
        this.options = options;
    }
    start() {
        if (this.timer)
            return;
        const intervalMs = this.options.intervalMinutes * 60 * 1000;
        this.timer = setInterval(() => this.tick(), intervalMs);
        this.tick();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async tick() {
        const useCase = new DistillSessionsUseCase(this.memoryRepository, this.sessionRepository);
        const result = await useCase.execute({ limit: 10 });
        this.options.onTick?.(result);
    }
}
//# sourceMappingURL=heartbeat.js.map