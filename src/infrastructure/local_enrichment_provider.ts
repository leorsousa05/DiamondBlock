import type { Memory } from '../domain/memory.js';
import type { EnrichmentProvider, EnrichmentResult } from '../application/ports/enrichment_provider.js';

const DEFAULT_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'to', 'of', 'in', 'for', 'on', 'at', 'by', 'with', 'from', 'as', 'it',
  'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'what',
  'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'has', 'had',
  'have', 'do', 'does', 'did', 'done', 'doing', 'get', 'got', 'getting', 'use',
  'using', 'used', 'make', 'made', 'making', 'one', 'two', 'three', 'first',
  'also', 'new', 'like', 'may', 'way', 'need', 'needs', 'needed', 'want', 'wanted',
]);

const DEFAULT_TECH_TERMS = new Set([
  'typescript', 'javascript', 'python', 'rust', 'go', 'java', 'kotlin', 'swift',
  'c++', 'c#', 'ruby', 'php', 'scala', 'dart', 'elixir', 'clojure', 'haskell',
  'react', 'vue', 'angular', 'svelte', 'solid', 'nextjs', 'nuxt', 'remix',
  'nodejs', 'deno', 'bun', 'express', 'fastify', 'nestjs', 'hono',
  'tailwind', 'bootstrap', 'sass', 'css', 'html', 'wasm', 'webgl', 'graphql',
  'rest', 'api', 'json', 'yaml', 'xml', 'toml', 'sql', 'nosql', 'postgres',
  'mongodb', 'redis', 'sqlite', 'prisma', 'drizzle', 'typeorm', 'sequelize',
  'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins', 'github', 'gitlab',
  'aws', 'gcp', 'azure', 'vercel', 'netlify', 'cloudflare', 'npm', 'pnpm', 'yarn',
  'vite', 'webpack', 'rollup', 'esbuild', 'babel', 'eslint', 'prettier', 'vitest',
  'jest', 'cypress', 'playwright', 'mocha', 'chai', 'supertest', 'openapi', 'grpc',
  'kafka', 'rabbitmq', 'mqtt', 'websockets', 'oauth', 'jwt', 'sso', 'ldap',
  'mcp', 'llm', 'ai', 'ml', 'vector', 'embedding', 'transformer',
]);

export interface LocalEnrichmentProviderOptions {
  stopWords?: Set<string>;
  techTerms?: Set<string>;
}

export class LocalEnrichmentProvider implements EnrichmentProvider {
  private readonly stopWords: Set<string>;
  private readonly techTerms: Set<string>;

  constructor(options: LocalEnrichmentProviderOptions = {}) {
    this.stopWords = options.stopWords ?? DEFAULT_STOP_WORDS;
    this.techTerms = options.techTerms ?? DEFAULT_TECH_TERMS;
  }

  async enrich(memory: Memory): Promise<EnrichmentResult> {
    const text = `${memory.title}\n${memory.content}`;
    const words = tokenize(text);

    const candidateTags = new Set<string>();
    const entities = new Set<string>();

    for (const word of words) {
      const lower = word.toLowerCase();
      if (this.stopWords.has(lower)) continue;

      if (this.techTerms.has(lower)) {
        candidateTags.add(lower);
      }

      if (lower.length >= 4) {
        candidateTags.add(lower);
      }

      if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(word)) {
        entities.add(word);
      }

      if (/^[a-z]+(?:[A-Z][a-z]+)+$/.test(word)) {
        entities.add(word);
      }
    }

    const extractedTags = Array.from(candidateTags).slice(0, 10);
    const extractedEntities = Array.from(entities).slice(0, 10);
    const summary = generateSummary(memory.title, memory.content);
    const confidence = computeConfidence(text, extractedTags.length + extractedEntities.length);

    return {
      tags: extractedTags,
      summary,
      entities: extractedEntities,
      confidence,
    };
  }
}

function tokenize(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function generateSummary(title: string, content: string): string {
  const combined = `${title}. ${content}`;
  const firstSentence = combined.match(/[^.!?]+[.!?]+/);
  if (firstSentence) {
    const sentence = firstSentence[0].trim();
    if (sentence.length >= 20) {
      return sentence.length > 200 ? `${sentence.slice(0, 197)}...` : sentence;
    }
  }

  const snippet = combined.slice(0, 200).trim();
  return snippet.length < combined.length ? `${snippet}...` : snippet;
}

function computeConfidence(text: string, extractionCount: number): number {
  const length = text.length;
  if (length < 40) return 0;

  const density = extractionCount / Math.max(1, Math.floor(length / 40));
  const lengthScore = Math.min(1, length / 200);
  const densityScore = Math.min(1, density * 2);

  return Math.round(Math.min(1, (lengthScore * 0.6 + densityScore * 0.4)) * 100) / 100;
}
