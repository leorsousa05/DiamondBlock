import matter from 'gray-matter';
import type { Memory, MemoryType } from '../domain/memory.js';

export interface MemoryFrontmatter {
  id: string;
  type: MemoryType;
  scope: string;
  created_at: string;
  updated_at: string;
  source: string;
  tags?: string[];
  confidence?: number;
  summary?: string;
  entities?: string[];
}

export function memoryToMarkdown(memory: Memory): string {
  const frontmatter: MemoryFrontmatter = {
    id: memory.id,
    type: memory.type,
    scope: memory.scope,
    created_at: memory.createdAt.toISOString(),
    updated_at: memory.updatedAt.toISOString(),
    source: memory.source,
    tags: memory.tags,
    confidence: memory.confidence,
    ...(memory.summary && { summary: memory.summary }),
    ...(memory.entities && memory.entities.length > 0 && { entities: memory.entities }),
  };

  const lines = [
    '---',
    stringifyFrontmatter((frontmatter as unknown) as Record<string, unknown>),
    '---',
    '',
    `# ${memory.title}`,
    '',
    memory.content,
  ];

  return lines.join('\n');
}

export function memoryFromMarkdown(id: string, raw: string): Memory {
  const parsed = matter(raw);
  const fm = parsed.data as Partial<MemoryFrontmatter>;
  const lines = parsed.content.split('\n');
  const titleIndex = lines.findIndex((line) => line.startsWith('# '));
  const title = titleIndex >= 0 ? lines[titleIndex].replace(/^#\s*/, '') : 'Untitled';
  const content = titleIndex >= 0
    ? lines.slice(titleIndex + 1).join('\n').trim()
    : parsed.content.trim();

  return {
    id: fm.id ?? id,
    type: (fm.type ?? 'knowledge') as MemoryType,
    scope: fm.scope ?? 'global',
    title,
    content,
    createdAt: parseDate(fm.created_at),
    updatedAt: parseDate(fm.updated_at),
    source: fm.source ?? 'manual',
    tags: fm.tags ?? [],
    confidence: fm.confidence ?? 1.0,
    ...(fm.summary !== undefined && { summary: fm.summary }),
    ...(fm.entities !== undefined && { entities: fm.entities }),
  };
}

export function sessionToMarkdown(session: {
  id: string;
  projectId: string;
  createdAt: Date;
  messages: Array<{ role: string; content: string; timestamp: Date }>;
}): string {
  const frontmatter = {
    id: session.id,
    project_id: session.projectId,
    created_at: session.createdAt.toISOString(),
    processed: false,
  };

  const lines = [
    '---',
    stringifyFrontmatter(frontmatter),
    '---',
    '',
    '# Session Log',
    '',
    ...session.messages.map((m) => `## ${m.role} (${m.timestamp.toISOString()})\n\n${m.content}`),
  ];

  return lines.join('\n\n');
}

export function parseSessionFromMarkdown(id: string, raw: string): {
  id: string;
  projectId: string;
  createdAt: Date;
  processed: boolean;
  messages: Array<{ role: string; content: string; timestamp: Date }>;
} {
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const content = parsed.content.replace(/^#\s*.*\n?/, '').trim();

  const messageBlocks = content
    .split(/\n## /)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && ['user', 'assistant', 'system'].includes(b.split(' ')[0]?.toLowerCase() ?? ''));
  const messages = messageBlocks.map((block) => {
    const [header, ...bodyParts] = block.split('\n\n');
    const role = header.split(' ')[0]?.toLowerCase() ?? 'unknown';
    const timestampMatch = header.match(/\(([^)]+)\)/);
    return {
      role,
      content: bodyParts.join('\n\n').trim(),
      timestamp: parseDate(timestampMatch?.[1]),
    };
  });

  return {
    id: (fm.id as string) ?? id,
    projectId: (fm.project_id as string) ?? 'unknown',
    createdAt: parseDate(fm.created_at as string | undefined),
    processed: (fm.processed as boolean) ?? false,
    messages,
  };
}

function stringifyFrontmatter(obj: Record<string, unknown>): string {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');
}

function parseDate(value: string | undefined): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
