import type { Session } from '../../domain/session.js';

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  listRecent(limit: number, projectId?: string): Promise<Session[]>;
}
