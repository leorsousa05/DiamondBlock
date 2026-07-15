import ts from 'typescript';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type {
  CodeParser,
  SymbolRelation,
  CodeSymbol,
  ParsingResult,
  SymbolKind,
} from '../application/ports/code_parser.js';

const SUPPORTED_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mts',
  'cts',
  'mjs',
  'cjs',
]);

function getExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  const dotIndex = lower.lastIndexOf('.');
  return dotIndex > 0 ? lower.slice(dotIndex + 1) : '';
}

function isSupported(file: SourceFile): boolean {
  return SUPPORTED_EXTENSIONS.has(getExtension(file.relativePath));
}

function getScriptKind(file: SourceFile): ts.ScriptKind {
  const ext = getExtension(file.relativePath);
  switch (ext) {
    case 'tsx':
      return ts.ScriptKind.TSX;
    case 'jsx':
      return ts.ScriptKind.JSX;
    case 'js':
    case 'mjs':
    case 'cjs':
      return ts.ScriptKind.JS;
    case 'ts':
    case 'mts':
    case 'cts':
    default:
      return ts.ScriptKind.TS;
  }
}

function symbolKindFromNode(node: ts.Node): SymbolKind {
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isMethodDeclaration(node)) return 'method';
  if (ts.isArrowFunction(node)) return 'function';
  if (ts.isVariableStatement(node)) return 'variable';
  return 'unknown';
}

function isExported(node: ts.Node): boolean {
  if (!('modifiers' in node)) return false;
  const modifiers = (node as { modifiers?: ts.NodeArray<ts.ModifierLike> }).modifiers;
  if (!modifiers) return false;
  return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function nodeName(node: ts.Node): string | undefined {
  if (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node)
  ) {
    return node.name?.getText();
  }

  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration && ts.isIdentifier(declaration.name)) {
      return declaration.name.getText();
    }
  }

  return undefined;
}

function isComponent(name: string, node: ts.Node): boolean {
  if (!/^[A-Z]/.test(name)) return false;
  if (ts.isFunctionDeclaration(node)) return true;
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (!declaration?.initializer) return false;
    return ts.isArrowFunction(declaration.initializer) || ts.isCallExpression(declaration.initializer);
  }
  return false;
}

function isHook(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

function getLine(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function getEndLine(node: ts.Node, sourceFile: ts.SourceFile): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
}

export class TypeScriptParser implements CodeParser {
  canParse(file: SourceFile): boolean {
    return isSupported(file);
  }

  async parse(file: SourceFile, content: string): Promise<ParsingResult> {
    const sourceFile = ts.createSourceFile(
      file.relativePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      getScriptKind(file)
    );

    const hasParseErrors = this.hasParseErrors(sourceFile);
    const confidence = hasParseErrors ? 0.6 : 0.95;

    const imports = this.extractImports(sourceFile);
    const symbols: CodeSymbol[] = [];
    const relations: SymbolRelation[] = [];
    const chunks: CodeChunkInput[] = [];

    const visit = (node: ts.Node) => {
      if (this.isTopLevelSymbol(node, sourceFile)) {
        const name = nodeName(node);
        const startLine = getLine(node, sourceFile);
        const endLine = getEndLine(node, sourceFile);

        if (name) {
          let kind = symbolKindFromNode(node);
          if (isComponent(name, node)) {
            kind = 'component';
          } else if (isHook(name)) {
            kind = 'hook';
          }

          const symbolId = this.symbolId(file.relativePath, name, startLine);
          symbols.push({
            id: symbolId,
            name,
            kind,
            startLine,
            endLine,
            signature: this.buildSignature(name, node, sourceFile),
          });

          const chunkContent = this.extractSymbolContent(
            content,
            startLine,
            endLine
          );

          const symbolRelations = this.extractRelations(symbolId, node, sourceFile);

          chunks.push({
            filePath: file.relativePath,
            startLine,
            endLine,
            language: this.detectLanguage(file.relativePath),
            content: chunkContent,
            metadata: {
              parsingMode: 'ast',
              confidence,
              supportsGraph: true,
              supportsSymbols: true,
              language: this.detectLanguage(file.relativePath),
              imports,
              symbolIds: [symbolId],
              chunkType: kind,
              relationCount: symbolRelations.length,
            },
          });

          relations.push(...symbolRelations);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      language: this.detectLanguage(file.relativePath),
      parsingMode: 'ast',
      confidence,
      supportsGraph: true,
      supportsSymbols: true,
      symbols,
      relations,
      chunks,
    };
  }

  private hasParseErrors(sourceFile: ts.SourceFile & { parseDiagnostics?: readonly ts.Diagnostic[] }): boolean {
    const diagnostics = sourceFile.parseDiagnostics;
    if (!diagnostics || diagnostics.length === 0) return false;
    return diagnostics.some((d: ts.Diagnostic) => d.category === ts.DiagnosticCategory.Error);
  }

  private isTopLevelSymbol(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    if (node.parent !== sourceFile) return false;

    return (
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isVariableStatement(node)
    );
  }

  private extractImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const text = node.getText(sourceFile);
        imports.push(text);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  private buildSignature(
    name: string,
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): string | undefined {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const params = node.parameters.map((p) => p.getText(sourceFile)).join(', ');
      const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : '';
      return `${name}(${params})${returnType}`;
    }

    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const typeParams = node.typeParameters
        ? `<${node.typeParameters.map((tp) => tp.getText(sourceFile)).join(', ')}>`
        : '';
      return `${name}${typeParams}`;
    }

    return undefined;
  }

  private extractRelations(
    fromSymbolId: string,
    node: ts.Node,
    sourceFile: ts.SourceFile
  ): SymbolRelation[] {
    const relations: SymbolRelation[] = [];

    for (const moduleSpecifier of this.extractImportSpecifiers(sourceFile)) {
      relations.push({
        fromSymbolId,
        toModuleSpecifier: moduleSpecifier,
        type: 'imports',
        confidence: 0.7,
      });
    }

    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      for (const clause of node.heritageClauses ?? []) {
        for (const heritageType of clause.types) {
          relations.push({
            fromSymbolId,
            toSymbolName: heritageType.expression.getText(sourceFile),
            type: clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements',
            confidence: 0.8,
          });
        }
      }
    }

    return relations;
  }

  private extractImportSpecifiers(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];

    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        imports.push(statement.moduleSpecifier.text);
      }
    }

    return [...new Set(imports)];
  }

  private extractSymbolContent(
    content: string,
    startLine: number,
    endLine: number
  ): string {
    const lines = content.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  private symbolId(filePath: string, name: string, startLine: number): string {
    const seed = `${filePath}:${name}:${startLine}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const suffix = Math.abs(hash).toString(36).padStart(8, '0');
    return `sym_${suffix}`;
  }

  private detectLanguage(filePath: string): string {
    const ext = getExtension(filePath);
    return ext === 'tsx' || ext === 'jsx' || ext === 'ts' || ext === 'mts' || ext === 'cts'
      ? 'typescript'
      : 'javascript';
  }
}
