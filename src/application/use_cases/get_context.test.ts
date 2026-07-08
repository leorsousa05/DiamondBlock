import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GetContextUseCase } from './get_context.js';
import { FileMemoryRepository } from '../../infrastructure/file_memory_repository.js';
import { FileSessionRepository } from '../../infrastructure/file_session_repository.js';
import { createMemory } from '../../domain/memory.js';
import { createSession } from '../../domain/session.js';

describe('GetContextUseCase', () => {
  let basePath: string;
  let memoryRepo: FileMemoryRepository;
  let sessionRepo: FileSessionRepository;

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'db-context-'));
    memoryRepo = new FileMemoryRepository({ basePath });
    sessionRepo = new FileSessionRepository({ basePath });
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('returns user, project, and global memory', async () => {
    const userMemory = createMemory({
      type: 'user',
      scope: 'user',
      title: 'User Preferences',
      content: 'Prefer TypeScript',
    });
    const projectMemory = createMemory({
      type: 'project',
      scope: 'project/demo',
      title: 'Demo',
      content: 'Use SQLite',
    });
    const globalMemory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Global Knowledge',
      content: 'Use semantic versioning',
    });

    await memoryRepo.save(userMemory);
    await memoryRepo.save(projectMemory);
    await memoryRepo.save(globalMemory);

    const useCase = new GetContextUseCase(memoryRepo, sessionRepo);
    const context = await useCase.execute({ sessionId: 'sess_1', projectId: 'demo' });

    expect(context.user_memory).toContain('User Preferences');
    expect(context.project_memory).toContain('Demo');
    expect(context.global_memory).toContain('Global Knowledge');
    expect(context.code_context).toBe('No indexed code context yet.');
  });

  it('only returns user memory with type user and scope user', async () => {
    const validUserMemory = createMemory({
      type: 'user',
      scope: 'user',
      title: 'Valid User Memory',
      content: 'Prefer TypeScript',
    });
    const invalidUserMemory = createMemory({
      type: 'user',
      scope: 'project/demo',
      title: 'Invalid User Memory',
      content: 'Should not appear',
    });

    await memoryRepo.save(validUserMemory);
    await memoryRepo.save(invalidUserMemory);

    const useCase = new GetContextUseCase(memoryRepo, sessionRepo);
    const context = await useCase.execute({ sessionId: 'sess_1', projectId: 'demo' });

    expect(context.user_memory).toContain('Valid User Memory');
    expect(context.user_memory).not.toContain('Should not appear');
  });

  it('mixes project and global memories in relevant_memories', async () => {
    const projectMemory = createMemory({
      type: 'project',
      scope: 'project/demo',
      title: 'Project Note',
      content: 'project demo notes',
    });
    const globalMemory = createMemory({
      type: 'knowledge',
      scope: 'global',
      title: 'Global Note',
      content: 'project demo global notes',
    });

    await memoryRepo.save(projectMemory);
    await memoryRepo.save(globalMemory);

    const useCase = new GetContextUseCase(memoryRepo, sessionRepo);
    const context = await useCase.execute({ sessionId: 'sess_1', projectId: 'demo' });

    expect(context.relevant_memories.length).toBe(2);
    expect(context.relevant_memories[0]).toContain('Project Note');
    expect(context.relevant_memories[1]).toContain('Global Note');
  });

  it('includes recent sessions for the project', async () => {
    const session = createSession({
      projectId: 'demo',
      messages: [{ role: 'user', content: 'Hello', timestamp: new Date() }],
    });
    await sessionRepo.save(session);

    const useCase = new GetContextUseCase(memoryRepo, sessionRepo);
    const context = await useCase.execute({ sessionId: 'sess_2', projectId: 'demo' });

    expect(context.recent_sessions.length).toBe(1);
    expect(context.recent_sessions[0]).toContain('Hello');
  });
});
