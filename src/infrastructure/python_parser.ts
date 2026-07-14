import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type {
  CodeParser,
  CodeSymbol,
  ParsingResult,
  SymbolKind,
} from '../application/ports/code_parser.js';
import {
  buildChunks,
  buildSignature,
  buildSymbolId,
} from './chunk_builder.js';

export interface PythonParserOptions {
  /** If true, parse errors fall back to the injected simplified parser instead of propagating. */
  fallbackOnError?: boolean;
  simplifiedParser?: CodeParser;
}

export class PythonParser implements CodeParser {
  private readonly parser: Parser;

  constructor(private readonly options: PythonParserOptions = {}) {
    this.parser = new Parser();
    this.parser.setLanguage(Python as unknown as Parser.Language);
  }

  canParse(file: SourceFile): boolean {
    return file.relativePath.toLowerCase().endsWith('.py');
  }

  async parse(file: SourceFile, content: string): Promise<ParsingResult> {
    try {
      const tree = this.parser.parse(content);
      const root = tree.rootNode;

      if (root.hasError && this.options.fallbackOnError && this.options.simplifiedParser) {
        return this.options.simplifiedParser.parse(file, content);
      }

      const imports = this.extractImports(root);
      const symbols = this.extractSymbols(file, content, root);
      const lines = content.split('\n');
      const chunks = buildChunks({
        file,
        lines,
        symbols,
        language: 'python',
        imports,
        parsingMode: 'ast',
        confidence: 0.9,
        supportsGraph: true,
        supportsSymbols: true,
      });

      return {
        language: 'python',
        parsingMode: 'ast',
        confidence: 0.9,
        supportsGraph: true,
        supportsSymbols: true,
        symbols,
        relations: [],
        chunks,
      };
    } catch (error) {
      if (this.options.fallbackOnError && this.options.simplifiedParser) {
        return this.options.simplifiedParser.parse(file, content);
      }
      throw error;
    }
  }

  private extractImports(root: Parser.SyntaxNode): string[] {
    const imports: string[] = [];

    const visit = (node: Parser.SyntaxNode) => {
      if (node.type === 'import_statement' || node.type === 'import_from_statement') {
        imports.push(node.text.trim());
      }
      for (const child of node.children) {
        visit(child);
      }
    };

    visit(root);
    return [...new Set(imports)];
  }

  private extractSymbols(
    file: SourceFile,
    content: string,
    root: Parser.SyntaxNode
  ): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    const visit = (node: Parser.SyntaxNode, insideClass: boolean) => {
      if (node.type === 'function_definition' || node.type === 'class_definition') {
        const nameNode = node.children.find((child) => child.type === 'identifier');
        if (!nameNode) {
          for (const child of node.children) visit(child, node.type === 'class_definition');
          return;
        }

        const name = nameNode.text;
        const startLine = node.startPosition.row + 1;
        const endLine = node.endPosition.row + 1;
        const kind: SymbolKind = this.symbolKind(node, insideClass);

        symbols.push({
          id: buildSymbolId(file.relativePath, name, startLine),
          name,
          kind,
          startLine,
          endLine,
          signature: buildSignature(lines[startLine - 1], name, kind),
        });

        // Visit children to find methods inside classes, but not nested functions.
        for (const child of node.children) {
          if (child.type === 'block') {
            for (const blockChild of child.children) {
              visit(blockChild, node.type === 'class_definition');
            }
          }
        }
        return;
      }

      for (const child of node.children) {
        visit(child, insideClass);
      }
    };

    for (const child of root.children) {
      visit(child, false);
    }

    return symbols;
  }

  private symbolKind(node: Parser.SyntaxNode, insideClass: boolean): SymbolKind {
    if (node.type === 'class_definition') return 'class';
    if (node.type === 'function_definition') {
      return insideClass ? 'method' : 'function';
    }
    return 'unknown';
  }
}
