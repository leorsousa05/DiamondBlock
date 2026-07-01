import { Distiller } from '../../domain/services/distiller.js';
import type { MemoryRepository } from '../ports/memory_repository.js';
import type { SessionRepository } from '../ports/session_repository.js';

export interface DistillSessionsInput {
  dryRun?: boolean;
  limit?: number;
}

export interface DistillSessionsOutput {
  processed: number;
  memoriesCreated: number;
}

export class DistillSessionsUseCase {
  constructor(
    private readonly memoryRepository: MemoryRepository,
    private readonly sessionRepository: SessionRepository
  ) {}

  async execute(input: DistillSessionsInput = {}): Promise<DistillSessionsOutput> {
    const repo = this.sessionRepository as unknown as {
      listUnprocessed(limit: number): Promise<import('../../domain/session.js').Session[]>;
      markProcessed(sessionId: string): Promise<void>;
    };

    const distiller = new Distiller({
      findUnprocessedSessions: (limit) => repo.listUnprocessed(limit),
      saveMemory: (memory) => this.memoryRepository.save(memory),
      markSessionProcessed: (sessionId) => repo.markProcessed(sessionId),
    });

    return distiller.distill({ dryRun: input.dryRun, limit: input.limit });
  }
}
