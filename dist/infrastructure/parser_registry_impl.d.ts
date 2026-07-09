import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser } from '../application/ports/code_parser.js';
import type { ParserRegistry } from '../application/ports/parser_registry.js';
export declare class ParserRegistryImpl implements ParserRegistry {
    private readonly parsers;
    register(language: string, parser: CodeParser): void;
    findParser(file: SourceFile): CodeParser | null;
}
//# sourceMappingURL=parser_registry_impl.d.ts.map