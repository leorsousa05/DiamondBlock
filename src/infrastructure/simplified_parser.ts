import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type {
  CodeParser,
  CodeSymbol,
  ParsingResult,
  SymbolKind,
} from '../application/ports/code_parser.js';
import type { LanguagePatternSet, SymbolPattern } from '../application/ports/language_pattern.js';
import {
  buildChunks,
  buildSignature,
  buildSymbolId,
} from './chunk_builder.js';

export interface SimplifiedParserOptions {
  patterns: LanguagePatternSet;
  confidence?: number;
}

export class SimplifiedParser implements CodeParser {
  private readonly confidence: number;

  constructor(private readonly options: SimplifiedParserOptions) {
    this.confidence = options.confidence ?? 0.65;
  }

  canParse(file: SourceFile): boolean {
    const lower = file.relativePath.toLowerCase();
    return this.options.patterns.fileExtensions.some((ext) =>
      lower.endsWith(ext.startsWith('.') ? ext : `.${ext}`)
    );
  }

  async parse(file: SourceFile, content: string): Promise<ParsingResult> {
    const lines = content.split('\n');
    const language = this.options.patterns.language;
    const imports = this.extractImports(lines);
    const symbols = this.extractSymbols(file, lines);
    const chunks = buildChunks({
      file,
      lines,
      symbols,
      language,
      imports,
      parsingMode: 'simplified',
      confidence: this.confidence,
      supportsGraph: false,
      supportsSymbols: true,
    });

    return {
      language,
      parsingMode: 'simplified',
      confidence: this.confidence,
      supportsGraph: false,
      supportsSymbols: true,
      symbols,
      relations: [],
      chunks,
    };
  }

  private extractImports(lines: string[]): string[] {
    const imports: string[] = [];
    const pattern = this.options.patterns.importPattern;

    for (const line of lines) {
      const match = pattern.exec(line);
      if (match?.groups?.module) {
        imports.push(line.trim());
      }
    }

    return [...new Set(imports)];
  }

  private extractSymbols(file: SourceFile, lines: string[]): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of this.options.patterns.symbolPatterns) {
        if (pattern.topLevelOnly && line.match(/^\s*/)?.[0].length !== 0) {
          continue;
        }

        const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : `${pattern.regex.flags}g`);
        const match = regex.exec(line);
        if (match?.groups?.name) {
          const name = match.groups.name;
          const startLine = i + 1;
          const endLine = this.findSymbolEndLine(lines, i);
          const kind: SymbolKind = pattern.kind;

          symbols.push({
            id: buildSymbolId(file.relativePath, name, startLine),
            name,
            kind,
            startLine,
            endLine,
            signature: buildSignature(line, name, kind),
          });
        }
      }
    }

    return symbols;
  }

  private findSymbolEndLine(lines: string[], startIndex: number): number {
    const isContinuation = this.options.patterns.isContinuation;
    const startIndent = lines[startIndex].match(/^\s*/)?.[0].length ?? 0;
    let endIndex = startIndex;
    let lastNonBlankIndex = startIndex;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const currentLine = lines[i - 1];
      const nextLine = lines[i];
      const nextIsBlank = nextLine.trim().length === 0;
      const nextIndent = nextLine.match(/^\s*/)?.[0].length ?? 0;

      if (isContinuation?.(currentLine, nextLine)) {
        endIndex = i;
        if (!nextIsBlank) {
          lastNonBlankIndex = i;
        }
        continue;
      }

      // Stop when the next non-blank line has indentation less than or equal to the start line.
      if (!nextIsBlank && nextIndent <= startIndent) {
        break;
      }

      endIndex = i;
      if (!nextIsBlank) {
        lastNonBlankIndex = i;
      }
    }

    return lastNonBlankIndex + 1;
  }
}
