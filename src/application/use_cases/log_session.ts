import { createSession, type SessionMessage } from '../../domain/session.js';
import type { SessionRepository } from '../ports/session_repository.js';

export interface LogSessionInput {
  sessionId: string;
  projectId: string;
  messages: SessionMessage[];
}

export class LogSessionUseCase {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(input: LogSessionInput): Promise<void> {
    const session = createSession(
      {
        projectId: input.projectId,
        messages: input.messages,
      },
      input.sessionId
    );

    await this.sessionRepository.save(session);
  }
}
