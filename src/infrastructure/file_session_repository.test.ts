import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileSessionRepository } from '../infrastructure/file_session_repository.js';
import { createSession } from '../domain/session.js';

describe('FileSessionRepository', () => {
  let basePath: string;
  let repo: FileSessionRepository;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-session-'));
    repo = new FileSessionRepository({ basePath });
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('saves and finds a session', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [{ role: 'user', content: 'Hi', timestamp: new Date() }],
    });

    await repo.save(session);
    const found = await repo.findById(session.id);

    expect(found).not.toBeNull();
    expect(found?.projectId).toBe('demo');
    expect(found?.messages.length).toBe(1);
  });

  it('lists recent sessions', async () => {
    await repo.save(
      createSession({
        projectId: 'demo',
        messages: [{ role: 'user', content: 'A', timestamp: new Date() }],
      })
    );

    const sessions = await repo.listRecent(10, 'demo');
    expect(sessions.length).toBe(1);
  });
});
