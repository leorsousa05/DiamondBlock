import type { SourceFile } from './codebase_scanner.js';
import type { CodeParser } from './code_parser.js';
export interface ParserRegistry {
    register(language: string, parser: CodeParser): void;
    findParser(file: SourceFile): CodeParser | null;
}
//# sourceMappingURL=parser_registry.d.ts.map