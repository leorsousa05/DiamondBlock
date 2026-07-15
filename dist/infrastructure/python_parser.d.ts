import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult } from '../application/ports/code_parser.js';
export interface PythonParserOptions {
    /** If true, parse errors fall back to the injected simplified parser instead of propagating. */
    fallbackOnError?: boolean;
    simplifiedParser?: CodeParser;
}
export declare class PythonParser implements CodeParser {
    private readonly options;
    private readonly parser;
    constructor(options?: PythonParserOptions);
    canParse(file: SourceFile): boolean;
    parse(file: SourceFile, content: string): Promise<ParsingResult>;
    private extractImports;
    private extractSymbols;
    private symbolKind;
    private extractRelations;
    private extractImportSpecifiers;
    private extractSuperclasses;
}
//# sourceMappingURL=python_parser.d.ts.map