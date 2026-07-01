export type MemoryType = 'user' | 'project' | 'knowledge' | 'distilled';

export interface Memory {
  id: string;
  type: MemoryType;
  scope: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  source: string;
  tags: string[];
  confidence: number;
}

export interface MemoryInput {
  type: MemoryType;
  scope: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  confidence?: number;
}

export function createMemory(input: MemoryInput, id?: string): Memory {
  const now = new Date();
  return {
    id: id ?? generateId('mem'),
    type: input.type,
    scope: input.scope,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now,
    source: input.source ?? 'manual',
    tags: input.tags ?? [],
    confidence: input.confidence ?? 1.0,
  };
}

export function updateMemory(memory: Memory, updates: Partial<MemoryInput>): Memory {
  return {
    ...memory,
    ...(updates.type && { type: updates.type }),
    ...(updates.scope && { scope: updates.scope }),
    ...(updates.title && { title: updates.title }),
    ...(updates.content && { content: updates.content }),
    ...(updates.source && { source: updates.source }),
    ...(updates.tags && { tags: updates.tags }),
    ...(updates.confidence !== undefined && { confidence: updates.confidence }),
    updatedAt: new Date(),
  };
}

export function memoryToPlainText(memory: Memory): string {
  return `${memory.title}\n\n${memory.content}`;
}

function generateId(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${random}`;
}
