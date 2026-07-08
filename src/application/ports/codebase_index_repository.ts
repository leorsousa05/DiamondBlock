export interface FileIndexEntry {
  relativePath: string;
  contentHash: string;
  indexedAt: string;
  memoryIds: string[];
}

export interface CodebaseIndexManifest {
  projectId: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
  files: Record<string, FileIndexEntry>;
}

export interface CodebaseIndexRepository {
  load(projectId: string): Promise<CodebaseIndexManifest | null>;
  save(manifest: CodebaseIndexManifest): Promise<void>;
  delete(projectId: string): Promise<void>;
}
