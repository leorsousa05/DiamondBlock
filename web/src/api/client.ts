/* ── Shared Types ─────────────────────────────────────────── */

export type MemoryType = 'user' | 'project' | 'knowledge' | 'distilled';

export interface Memory {
  id: string;
  type: MemoryType;
  scope: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  tags: string[];
  confidence: number;
  summary?: string;
  entities?: string[];
  score?: number;
}

export interface Session {
  id: string;
  projectId: string;
  createdAt: string;
  processed: boolean;
  messageCount: number;
  messages?: SessionMessage[];
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface VaultStatus {
  vaultPath: string;
  embeddingProvider: string;
  memoryCount: number;
  sessionCount: number;
  version: string;
}

export interface IndexStatus {
  projectId: string;
  fileCount: number;
  chunkCount: number;
  lastIndexedAt: string | null;
}

export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  chunkType: string;
  language: string;
  metadata?: {
    parsingMode?: 'ast' | 'simplified' | 'fallback';
    relationCount?: number;
  };
}

export interface IndexEvaluationQueryResult {
  queryId: string;
  query: string;
  expectedFiles: string[];
  expectedSymbols: string[];
  returnedChunkIds: string[];
  returnedFiles: string[];
  hitTop1: boolean;
  hitTop3: boolean;
  hitTop5: boolean;
  retrievedTokenEstimate: number;
  baselineTokenEstimate: number;
  tokenReductionPercent: number;
}

export interface IndexEvaluationReport {
  projectId: string;
  fixtureName: string;
  generatedAt: string;
  totals: {
    filesIndexed: number;
    chunksIndexed: number;
    symbolsIndexed: number;
    relationsIndexed: number;
  };
  queries: IndexEvaluationQueryResult[];
  parserModes: {
    ast: number;
    simplified: number;
    fallback: number;
  };
  tokenSavings: {
    method: 'approximate';
    averageReductionPercent: number;
    minReductionPercent: number;
    maxReductionPercent: number;
  };
}

export interface McpTarget {
  name: string;
  label: string;
  configPath: string;
  detected: boolean;
}

export interface SseProgressEvent {
  phase: string;
  current: number;
  total: number;
  message: string;
}

export interface CreateMemoryBody {
  type: MemoryType;
  scope: string;
  title: string;
  content: string;
  tags?: string[];
  confidence?: number;
  source?: string;
  projectId?: string;
}

export interface UpdateMemoryBody {
  title?: string;
  content?: string;
  tags?: string[];
  confidence?: number;
  scope?: string;
}

export interface PurgeMemoriesBody {
  scope?: string;
  type?: MemoryType;
  projectId?: string;
}

export interface FileSystemBrowseResult {
  currentPath: string;
  parentPath: string | null;
  directories: string[];
  files: string[];
}

/* ── Fetch Wrapper ────────────────────────────────────────── */

const BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      qs.set(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/* ── API Functions ────────────────────────────────────────── */

export const api = {
  getStatus: () => apiFetch<VaultStatus>('/status'),

  listMemories: (params?: { scope?: string; project?: string; type?: MemoryType; limit?: number }) =>
    apiFetch<Memory[]>(`/memories${buildQuery(params ?? {})}`),

  searchMemories: (q: string, params?: { scope?: string; type?: MemoryType; limit?: number }) =>
    apiFetch<Memory[]>(`/memories${buildQuery({ q, ...params })}`),

  getMemory: (id: string) => apiFetch<Memory>(`/memories/${id}`),

  createMemory: (body: CreateMemoryBody) =>
    apiFetch<{ id: string }>('/memories', { method: 'POST', body: JSON.stringify(body) }),

  updateMemory: (id: string, body: UpdateMemoryBody) =>
    apiFetch<Memory>(`/memories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteMemory: (id: string) =>
    apiFetch<void>(`/memories/${id}`, { method: 'DELETE' }),

  purgeMemories: (body: PurgeMemoriesBody) =>
    apiFetch<{ deleted: number }>('/memories/purge', { method: 'POST', body: JSON.stringify(body) }),

  listSessions: (params?: { project?: string; limit?: number }) =>
    apiFetch<Session[]>(`/sessions${buildQuery(params ?? {})}`),

  getSession: (id: string) => apiFetch<Session>(`/sessions/${id}`),

  getIndexStatus: (project?: string) =>
    apiFetch<IndexStatus>(`/index/status${project ? `?project=${project}` : ''}`),

  listChunks: (params?: { project?: string; limit?: number }) =>
    apiFetch<CodeChunk[]>(`/index/chunks${buildQuery(params ?? {})}`),

  searchChunks: (q: string, params?: { project?: string; limit?: number }) =>
    apiFetch<CodeChunk[]>(`/index/search${buildQuery({ q, ...params })}`),

  runIndex: (body: { projectPath?: string; projectId?: string; force?: boolean; dryRun?: boolean }) =>
    apiFetch<{ operationId: string }>('/index/run', { method: 'POST', body: JSON.stringify(body) }),

  evaluateIndex: (body: {
    projectPath?: string;
    projectId?: string;
    query: string;
    expectedFiles?: string[];
    expectedSymbols?: string[];
    limit?: number;
    force?: boolean;
  }) => apiFetch<IndexEvaluationReport>('/index/evaluate', {
    method: 'POST',
    body: JSON.stringify(body),
  }),

  purgeIndex: (body?: { projectId?: string }) =>
    apiFetch<{ deleted: number }>('/index/purge', { method: 'POST', body: JSON.stringify(body ?? {}) }),

  cleanOrphans: (body?: { projectId?: string }) =>
    apiFetch<{ cleaned: number }>('/index/clean-orphans', { method: 'POST', body: JSON.stringify(body ?? {}) }),

  startDistill: (body?: { dryRun?: boolean; limit?: number }) =>
    apiFetch<{ operationId: string }>('/distill', { method: 'POST', body: JSON.stringify(body ?? {}) }),

  getMcpTargets: () => apiFetch<McpTarget[]>('/mcp/targets'),

  installMcp: (body: { targets: string[]; dryRun?: boolean }) =>
    apiFetch<{ installed: string[] }>('/mcp/install', { method: 'POST', body: JSON.stringify(body) }),

  browseDirectory: (path?: string) =>
    apiFetch<FileSystemBrowseResult>(`/fs/browse${buildQuery({ path })}`),
};
