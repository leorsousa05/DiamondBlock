import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser } from '../application/ports/code_parser.js';
import type { ParserRegistry } from '../application/ports/parser_registry.js';

export class ParserRegistryImpl implements ParserRegistry {
  private readonly parsers = new Map<string, CodeParser>();

  register(language: string, parser: CodeParser): void {
    this.parsers.set(language, parser);
  }

  findParser(file: SourceFile): CodeParser | null {
    for (const parser of this.parsers.values()) {
      if (parser.canParse(file)) {
        return parser;
      }
    }
    return null;
  }
}
