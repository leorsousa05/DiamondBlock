import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult } from '../application/ports/code_parser.js';
import type { LanguagePatternSet } from '../application/ports/language_pattern.js';
export interface SimplifiedParserOptions {
    patterns: LanguagePatternSet;
    confidence?: number;
}
export declare class SimplifiedParser implements CodeParser {
    private readonly options;
    private readonly confidence;
    constructor(options: SimplifiedParserOptions);
    canParse(file: SourceFile): boolean;
    parse(file: SourceFile, content: string): Promise<ParsingResult>;
    private extractImports;
    private extractSymbols;
    private findSymbolEndLine;
}
//# sourceMappingURL=simplified_parser.d.ts.map