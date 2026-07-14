import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import { buildChunks, buildSignature, buildSymbolId, } from './chunk_builder.js';
export class PythonParser {
    options;
    parser;
    constructor(options = {}) {
        this.options = options;
        this.parser = new Parser();
        this.parser.setLanguage(Python);
    }
    canParse(file) {
        return file.relativePath.toLowerCase().endsWith('.py');
    }
    async parse(file, content) {
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
        }
        catch (error) {
            if (this.options.fallbackOnError && this.options.simplifiedParser) {
                return this.options.simplifiedParser.parse(file, content);
            }
            throw error;
        }
    }
    extractImports(root) {
        const imports = [];
        const visit = (node) => {
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
    extractSymbols(file, content, root) {
        const symbols = [];
        const lines = content.split('\n');
        const visit = (node, insideClass) => {
            if (node.type === 'function_definition' || node.type === 'class_definition') {
                const nameNode = node.children.find((child) => child.type === 'identifier');
                if (!nameNode) {
                    for (const child of node.children)
                        visit(child, node.type === 'class_definition');
                    return;
                }
                const name = nameNode.text;
                const startLine = node.startPosition.row + 1;
                const endLine = node.endPosition.row + 1;
                const kind = this.symbolKind(node, insideClass);
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
    symbolKind(node, insideClass) {
        if (node.type === 'class_definition')
            return 'class';
        if (node.type === 'function_definition') {
            return insideClass ? 'method' : 'function';
        }
        return 'unknown';
    }
}
//# sourceMappingURL=python_parser.js.map