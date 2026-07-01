import type { MemoryRepository } from '../application/ports/memory_repository.js';
import type { SessionRepository } from '../application/ports/session_repository.js';
import { DistillSessionsUseCase } from '../application/use_cases/distill_sessions.js';

export interface HeartbeatOptions {
  intervalMinutes: number;
  onTick?: (result: { processed: number; memoriesCreated: number }) => void;
}

export class Heartbeat {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly options: HeartbeatOptions
  ) {}

  start(): void {
    if (this.timer) return;

    const intervalMs = this.options.intervalMinutes * 60 * 1000;
    this.timer = setInterval(() => this.tick(), intervalMs);
    this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    const useCase = new DistillSessionsUseCase(this.memoryRepository, this.sessionRepository);
    const result = await useCase.execute({ limit: 10 });
    this.options.onTick?.(result);
  }
}
