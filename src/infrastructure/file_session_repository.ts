import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Session, SessionMessage } from '../domain/session.js';
import type { SessionRepository } from '../application/ports/session_repository.js';
import { parseSessionFromMarkdown, sessionToMarkdown } from './markdown_serializer.js';
import { isNotFoundError, walkDirectory } from './file_system.js';

export interface FileSessionRepositoryOptions {
  basePath: string;
}

export class FileSessionRepository implements SessionRepository {
  private readonly sessionsDir: string;

  constructor(options: FileSessionRepositoryOptions) {
    this.sessionsDir = join(options.basePath, 'vault', 'Sessions');
  }

  async findById(id: string): Promise<Session | null> {
    const path = this.idToPath(id);
    try {
      await access(path);
      const raw = await readFile(path, 'utf-8');
      const parsed = parseSessionFromMarkdown(id, raw);
      return this.toSession(parsed);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  }

  async save(session: Session): Promise<void> {
    const path = this.resolvePath(session);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, sessionToMarkdown(session), 'utf-8');
  }

  async listRecent(limit: number, projectId?: string): Promise<Session[]> {
    let sessions = await this.listAll();

    if (projectId) {
      sessions = sessions.filter((s) => s.projectId === projectId);
    }

    return sessions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async listUnprocessed(limit: number): Promise<Session[]> {
    const sessions = await this.listAll();
    return sessions
      .filter((s) => !(s as unknown as Record<string, unknown>).processed)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit);
  }

  async markProcessed(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (!session) return;

    const path = this.resolvePath(session);
    const raw = await readFile(path, 'utf-8');
    const parsed = parseSessionFromMarkdown(sessionId, raw);
    parsed.processed = true;

    await writeFile(path, sessionToMarkdown(this.toSession(parsed)), 'utf-8');
  }

  private toSession(parsed: ReturnType<typeof parseSessionFromMarkdown>): Session {
    return {
      id: parsed.id,
      projectId: parsed.projectId,
      createdAt: parsed.createdAt,
      messages: parsed.messages.map((m) => ({
        role: m.role as SessionMessage['role'],
        content: m.content,
        timestamp: m.timestamp,
      })),
    };
  }

  private idToPath(id: string): string {
    return join(this.sessionsDir, `${id}.md`);
  }

  private resolvePath(session: Session): string {
    return this.idToPath(session.id);
  }

  private async listAll(): Promise<Session[]> {
    const files = await walkDirectory(this.sessionsDir);
    const sessions: Session[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const id = file.replace(this.sessionsDir + '/', '').replace(/\.md$/, '').replace(/\//g, '_');
      const raw = await readFile(file, 'utf-8');
      sessions.push(this.toSession(parseSessionFromMarkdown(id, raw)));
    }

    return sessions;
  }
}
