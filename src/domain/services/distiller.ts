import type { Memory, MemoryInput } from '../memory.js';
import { createMemory } from '../memory.js';
import type { Session } from '../session.js';

export interface DistillerDependencies {
  findUnprocessedSessions(limit: number): Promise<Session[]>;
  saveMemory(memory: Memory): Promise<void>;
  markSessionProcessed(sessionId: string): Promise<void>;
}

export interface DistillOptions {
  dryRun?: boolean;
  limit?: number;
}

export interface DistillResult {
  processed: number;
  memoriesCreated: number;
}

interface CategoryPattern {
  key: 'decisions' | 'problems' | 'actions' | 'preferences';
  heading: string;
  patterns: RegExp[];
  cap: number;
}

const CATEGORIES: CategoryPattern[] = [
  {
    key: 'decisions',
    heading: '## Decisions',
    patterns: [
      /\b(decidimos|decidiu|decided|decision|decisão|vamos usar|we will|we'll|let's|let us|escolhemos|chose|chosen|optamos|opted for|vou usar|ficamos com)\b/i,
    ],
    cap: 8,
  },
  {
    key: 'problems',
    heading: '## Problems / Root Causes',
    patterns: [
      /\b(erro|error|bug|falha|failed|failure|broken|quebrado|quebrou)\b/i,
      /\b(o problema|o erro|a causa|the problem|the issue|root cause|causa raiz)\b/i,
      /\b(não funciona|não estava funcionando|doesn't work|not working|wasn't working)\b/i,
      /\b(fixed by|fix:|corrigido|correção|resolvido|solução foi)\b/i,
    ],
    cap: 5,
  },
  {
    key: 'actions',
    heading: '## Action Items',
    patterns: [
      /\b(preciso|precisamos|need to|needs to|we need|temos que|tem que)\b/i,
      /\b(próximo passo|próximos passos|next step|next steps)\b/i,
      /\b(todo|fixme|falta|pendente|remaining)\b/i,
    ],
    cap: 5,
  },
  {
    key: 'preferences',
    heading: '## Preferences / Rejections',
    patterns: [
      /\b(prefiro|preferimos|prefer|i'd rather)\b/i,
      /\b(não usar|não use|don't use|do not use|evitar|avoid|nunca|never|always|sempre)\b/i,
    ],
    cap: 5,
  },
];

const FILE_PATH_PATTERN = /[\w\-./\\]+\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|json|ya?ml|toml|md|css|html|sh|sql)\b/gi;
const SYMBOL_PATTERN = /\b(?:[a-z][a-zA-Z0-9]+|[A-Z][a-zA-Z0-9]+)\(/g;
const MAX_TOPICS = 10;
const MAX_REFERENCES = 10;
const MIN_SENTENCE_LENGTH = 15;
const MAX_SENTENCE_LENGTH = 300;
const TITLE_MAX_LENGTH = 80;

export class Distiller {
  constructor(private readonly deps: DistillerDependencies) {}

  async distill(options: DistillOptions = {}): Promise<DistillResult> {
    const sessions = await this.deps.findUnprocessedSessions(options.limit ?? 10);
    let memoriesCreated = 0;

    for (const session of sessions) {
      const memory = this.extractMemory(session);
      if (memory) {
        if (!options.dryRun) {
          await this.deps.saveMemory(memory);
          await this.deps.markSessionProcessed(session.id);
        }
        memoriesCreated++;
      }
    }

    return {
      processed: sessions.length,
      memoriesCreated,
    };
  }

  private extractMemory(session: Session): Memory | null {
    if (session.messages.length === 0) return null;

    const summary = this.summarize(session);
    const input: MemoryInput = {
      type: 'distilled',
      scope: `project/${session.projectId}`,
      title: this.buildTitle(session),
      content: summary,
      source: `session:${session.id}`,
      tags: ['distilled', 'session'],
      confidence: 0.8,
    };

    return createMemory(input);
  }

  private buildTitle(session: Session): string {
    const firstUserMessage = session.messages.find((m) => m.role === 'user');
    const candidate = firstUserMessage?.content.split('\n')[0]?.trim();

    if (candidate && candidate.length >= 10) {
      const truncated = candidate.length > TITLE_MAX_LENGTH
        ? `${candidate.slice(0, TITLE_MAX_LENGTH - 3).trimEnd()}...`
        : candidate;
      return `Distilled: ${truncated}`;
    }

    return `Distilled session ${session.id}`;
  }

  private summarize(session: Session): string {
    const topics = this.extractTopics(session);
    const references = this.extractReferences(session);
    const sections: string[] = [
      `Project: ${session.projectId}`,
      `Date: ${session.createdAt.toISOString()}`,
    ];

    if (topics.length > 0) {
      sections.push('', '## Topics', topics.map((t) => `- ${t}`).join('\n'));
    }

    for (const category of CATEGORIES) {
      const items = this.extractCategory(session, category);
      if (items.length > 0) {
        sections.push('', category.heading, items.map((item) => `- ${item}`).join('\n'));
      }
    }

    if (references.length > 0) {
      sections.push('', '## References', references.map((r) => `- \`${r}\``).join('\n'));
    }

    return sections.join('\n');
  }

  private extractCategory(session: Session, category: CategoryPattern): string[] {
    const items: string[] = [];
    const seen = new Set<string>();

    for (const message of session.messages) {
      for (const sentence of this.splitSentences(message.content)) {
        if (items.length >= category.cap) break;
        if (!category.patterns.some((pattern) => pattern.test(sentence))) continue;

        const normalized = sentence.toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        items.push(sentence);
      }
    }

    return items;
  }

  private splitSentences(content: string): string[] {
    return content
      .replace(/```[\s\S]*?```/g, ' ')
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_SENTENCE_LENGTH && s.length <= MAX_SENTENCE_LENGTH);
  }

  private extractTopics(session: Session): string[] {
    const text = session.messages.map((m) => m.content).join(' ');
    const codeBlockMatches = text.match(/```[\s\S]*?```/g);
    const technologies = new Set<string>();

    const patterns = [
      /\b(TypeScript|JavaScript|Python|Rust|Go|Node\.js|React|Next\.js|Vue|Angular|Docker|Kubernetes|PostgreSQL|MongoDB|Redis|SQLite)\b/gi,
      /\b(Claude|GPT|OpenAI|Anthropic|MCP|LLM|agent|embedding|vector)\b/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          technologies.add(match.toLowerCase());
        }
      }
    }

    if (codeBlockMatches) {
      technologies.add('code examples');
    }

    return Array.from(technologies).slice(0, MAX_TOPICS);
  }

  private extractReferences(session: Session): string[] {
    const text = session.messages.map((m) => m.content).join(' ');
    const references = new Set<string>();

    for (const match of text.matchAll(FILE_PATH_PATTERN)) {
      references.add(match[0]);
    }

    for (const match of text.matchAll(SYMBOL_PATTERN)) {
      references.add(match[0].slice(0, -1));
    }

    return Array.from(references).slice(0, MAX_REFERENCES);
  }
}
