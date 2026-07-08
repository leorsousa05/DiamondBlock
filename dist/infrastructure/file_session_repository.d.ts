import type { Session } from '../domain/session.js';
import type { SessionRepository } from '../application/ports/session_repository.js';
export interface FileSessionRepositoryOptions {
    basePath: string;
}
export declare class FileSessionRepository implements SessionRepository {
    private readonly sessionsDir;
    constructor(options: FileSessionRepositoryOptions);
    findById(id: string): Promise<Session | null>;
    save(session: Session): Promise<void>;
    listRecent(limit: number, projectId?: string): Promise<Session[]>;
    listUnprocessed(limit: number): Promise<Session[]>;
    markProcessed(sessionId: string): Promise<void>;
    private toSession;
    private idToPath;
    private resolvePath;
    private listAll;
}
//# sourceMappingURL=file_session_repository.d.ts.map