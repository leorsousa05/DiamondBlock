import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type {
  CodeParser,
  SymbolRelation,
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
      const relations = this.extractRelations(symbols, root);
      const relationCountBySymbol = new Map<string, number>();
      for (const relation of relations) {
        relationCountBySymbol.set(
          relation.fromSymbolId,
          (relationCountBySymbol.get(relation.fromSymbolId) ?? 0) + 1
        );
      }
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
      for (const chunk of chunks) {
        const symbolId = chunk.metadata?.symbolIds[0];
        if (chunk.metadata && symbolId) {
          chunk.metadata.relationCount = relationCountBySymbol.get(symbolId) ?? 0;
        }
      }

      return {
        language: 'python',
        parsingMode: 'ast',
        confidence: 0.9,
        supportsGraph: true,
        supportsSymbols: true,
        symbols,
        relations,
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

  private extractRelations(symbols: CodeSymbol[], root: Parser.SyntaxNode): SymbolRelation[] {
    const relations: SymbolRelation[] = [];
    const symbolByStartLine = new Map(symbols.map((symbol) => [symbol.startLine, symbol]));
    const imports = this.extractImportSpecifiers(root);

    for (const symbol of symbols) {
      for (const moduleSpecifier of imports) {
        relations.push({
          fromSymbolId: symbol.id,
          toModuleSpecifier: moduleSpecifier,
          type: 'imports',
          confidence: 0.7,
        });
      }
    }

    const visit = (node: Parser.SyntaxNode) => {
      if (node.type === 'class_definition') {
        const symbol = symbolByStartLine.get(node.startPosition.row + 1);
        if (symbol) {
          for (const superclass of this.extractSuperclasses(node)) {
            relations.push({
              fromSymbolId: symbol.id,
              toSymbolName: superclass,
              type: 'extends',
              confidence: 0.8,
            });
          }
        }
      }

      for (const child of node.children) {
        visit(child);
      }
    };

    visit(root);
    return relations;
  }

  private extractImportSpecifiers(root: Parser.SyntaxNode): string[] {
    const specifiers: string[] = [];

    const visit = (node: Parser.SyntaxNode) => {
      if (node.type === 'import_statement') {
        const text = node.text.replace(/^import\s+/, '').trim();
        if (text) specifiers.push(text);
      }
      if (node.type === 'import_from_statement') {
        const match = node.text.match(/^from\s+([^\s]+)\s+import\s+/);
        if (match?.[1]) specifiers.push(match[1]);
      }
      for (const child of node.children) {
        visit(child);
      }
    };

    visit(root);
    return [...new Set(specifiers)];
  }

  private extractSuperclasses(node: Parser.SyntaxNode): string[] {
    const argumentList = node.children.find((child) => child.type === 'argument_list');
    if (!argumentList) return [];

    return argumentList.children
      .filter((child) => child.type === 'identifier' || child.type === 'attribute')
      .map((child) => child.text.trim())
      .filter(Boolean);
  }
}
