import type { MemoryRepository } from '../application/ports/memory_repository.js';
import type { SessionRepository } from '../application/ports/session_repository.js';
export interface HeartbeatOptions {
    intervalMinutes: number;
    onTick?: (result: {
        processed: number;
        memoriesCreated: number;
    }) => void;
}
export declare class Heartbeat {
    private readonly memoryRepository;
    private readonly sessionRepository;
    private readonly options;
    private timer;
    constructor(memoryRepository: MemoryRepository, sessionRepository: SessionRepository, options: HeartbeatOptions);
    start(): void;
    stop(): void;
    tick(): Promise<void>;
}
//# sourceMappingURL=heartbeat.d.ts.map