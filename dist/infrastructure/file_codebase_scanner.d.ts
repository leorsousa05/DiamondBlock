import type { CodebaseScanner, CodebaseScannerOptions, SourceFile } from '../application/ports/codebase_scanner.js';
export declare class FileCodebaseScanner implements CodebaseScanner {
    scan(options: CodebaseScannerOptions): Promise<SourceFile[]>;
    private validateRootPath;
    private walk;
    private getExtension;
    private loadGitignoreRules;
    private parseGitignoreLine;
    private isIgnored;
    private ruleMatches;
    private matchPattern;
    private gitignorePatternToRegex;
}
//# sourceMappingURL=file_codebase_scanner.d.ts.map