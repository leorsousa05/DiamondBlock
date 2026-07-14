export interface SymbolPattern {
    /** Human-readable name of this pattern (for debugging). */
    name: string;
    /** Regex executed per line. Must capture `name` in a named group. */
    regex: RegExp;
    kind: 'function' | 'class' | 'method' | 'interface' | 'enum' | 'type' | 'variable' | 'unknown';
    /** Optional predicate to decide if the matched symbol is public/exported. */
    isPublic?: (match: RegExpExecArray, lines: string[], lineIndex: number) => boolean;
    /** If true, the pattern only matches at column 0 (top-level). */
    topLevelOnly?: boolean;
}
export interface LanguagePatternSet {
    language: string;
    fileExtensions: string[];
    /** Patterns executed line-by-line to detect symbols. */
    symbolPatterns: SymbolPattern[];
    /** Regex with a capture group to extract the module/path of an import. */
    importPattern: RegExp;
    /** Detect whether a line continues a multi-line symbol definition. */
    isContinuation?: (currentLine: string, nextLine: string) => boolean;
}
//# sourceMappingURL=language_pattern.d.ts.map