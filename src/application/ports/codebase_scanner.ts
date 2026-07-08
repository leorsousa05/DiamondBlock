export interface SourceFile {
  absolutePath: string;
  relativePath: string;
}

export interface CodebaseScannerOptions {
  rootPath: string;
  includeExtensions?: string[];
  maxFileSizeBytes?: number;
  respectGitignore?: boolean;
}

export interface CodebaseScanner {
  scan(options: CodebaseScannerOptions): Promise<SourceFile[]>;
}
