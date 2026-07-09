import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult } from '../application/ports/code_parser.js';
export declare class TypeScriptParser implements CodeParser {
    canParse(file: SourceFile): boolean;
    parse(file: SourceFile, content: string): Promise<ParsingResult>;
    private hasParseErrors;
    private isTopLevelSymbol;
    private extractImports;
    private buildSignature;
    private extractSymbolContent;
    private symbolId;
    private detectLanguage;
}
//# sourceMappingURL=typescript_parser.d.ts.map