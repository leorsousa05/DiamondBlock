import { describe, expect, it } from 'vitest';
import { ParserRegistryImpl } from './parser_registry_impl.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeParser, ParsingResult } from '../application/ports/code_parser.js';

class FakeParser implements CodeParser {
  constructor(private readonly extensions: string[]) {}

  canParse(file: SourceFile): boolean {
    const ext = file.relativePath.split('.').pop()?.toLowerCase() ?? '';
    return this.extensions.includes(ext);
  }

  async parse(file: SourceFile, _content: string): Promise<ParsingResult> {
    return {
      language: 'fake',
      parsingMode: 'ast',
      confidence: 1,
      supportsGraph: true,
      supportsSymbols: true,
      symbols: [],
      relations: [],
      chunks: [],
    };
  }
}

describe('ParserRegistryImpl', () => {
  const registry = new ParserRegistryImpl();
  const tsParser = new FakeParser(['ts', 'tsx', 'js', 'jsx']);
  const pyParser = new FakeParser(['py']);

  registry.register('typescript', tsParser);
  registry.register('python', pyParser);

  it('finds parser by file extension', () => {
    const tsFile = { absolutePath: '/tmp/app.ts', relativePath: 'src/app.ts' };
    expect(registry.findParser(tsFile)).toBe(tsParser);
  });

  it('finds parser for tsx files', () => {
    const tsxFile = { absolutePath: '/tmp/app.tsx', relativePath: 'src/app.tsx' };
    expect(registry.findParser(tsxFile)).toBe(tsParser);
  });

  it('finds parser for jsx files', () => {
    const jsxFile = { absolutePath: '/tmp/app.jsx', relativePath: 'src/app.jsx' };
    expect(registry.findParser(jsxFile)).toBe(tsParser);
  });

  it('returns null for unsupported extensions', () => {
    const goFile = { absolutePath: '/tmp/app.go', relativePath: 'src/app.go' };
    expect(registry.findParser(goFile)).toBeNull();
  });

  it('returns the first parser that can parse the file', () => {
    const customRegistry = new ParserRegistryImpl();
    const first = new FakeParser(['ts']);
    const second = new FakeParser(['ts', 'tsx']);
    customRegistry.register('first', first);
    customRegistry.register('second', second);

    const tsFile = { absolutePath: '/tmp/app.ts', relativePath: 'src/app.ts' };
    expect(customRegistry.findParser(tsFile)).toBe(first);
  });
});
