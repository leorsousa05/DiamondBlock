import { describe, expect, it } from 'vitest';
import { PythonParser } from './python_parser.js';
import { SimplifiedParser } from './simplified_parser.js';
import { pythonPatterns } from './language_patterns/python_patterns.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';

function sourceFile(relativePath: string): SourceFile {
  return { absolutePath: `/tmp/${relativePath}`, relativePath };
}

describe('PythonParser', () => {
  const parser = new PythonParser();

  it('can parse Python files', () => {
    expect(parser.canParse(sourceFile('src/app.py'))).toBe(true);
    expect(parser.canParse(sourceFile('src/app.ts'))).toBe(false);
  });

  it('parses module with classes and functions', async () => {
    const content = [
      'import json',
      '',
      'class TaxCalculator:',
      '    def calculate(self, income):',
      '        return income * 0.1',
      '',
      'def helper():',
      '    pass',
    ].join('\n');

    const result = await parser.parse(sourceFile('src/tax.py'), content);

    expect(result.parsingMode).toBe('ast');
    expect(result.confidence).toBe(0.9);
    expect(result.language).toBe('python');
    expect(result.supportsSymbols).toBe(true);
    expect(result.supportsGraph).toBe(true);

    const names = result.symbols.map((s) => s.name);
    expect(names).toContain('TaxCalculator');
    expect(names).toContain('calculate');
    expect(names).toContain('helper');

    const calcClass = result.symbols.find((s) => s.name === 'TaxCalculator');
    expect(calcClass?.kind).toBe('class');

    const calculateMethod = result.symbols.find((s) => s.name === 'calculate');
    expect(calculateMethod?.kind).toBe('method');

    const helperFunction = result.symbols.find((s) => s.name === 'helper');
    expect(helperFunction?.kind).toBe('function');

    expect(result.chunks.length).toBeGreaterThanOrEqual(3);
  });

  it('parses decorators and imports', async () => {
    const content = [
      'from functools import lru_cache',
      '',
      '@lru_cache',
      'def compute(n):',
      '    return n * 2',
    ].join('\n');

    const result = await parser.parse(sourceFile('src/decorated.py'), content);

    expect(result.symbols[0].name).toBe('compute');
    expect(result.symbols[0].kind).toBe('function');
    expect(result.chunks[0].metadata?.imports).toContain('from functools import lru_cache');
  });

  it('captures import and inheritance relation candidates', async () => {
    const content = [
      'from decimal import Decimal',
      '',
      'class Money(Decimal):',
      '    pass',
    ].join('\n');

    const result = await parser.parse(sourceFile('src/money.py'), content);
    const moneyClass = result.symbols.find((s) => s.name === 'Money');

    expect(moneyClass).toBeDefined();
    expect(result.relations).toContainEqual(expect.objectContaining({
      fromSymbolId: moneyClass?.id,
      toModuleSpecifier: 'decimal',
      type: 'imports',
    }));
    expect(result.relations).toContainEqual(expect.objectContaining({
      fromSymbolId: moneyClass?.id,
      toSymbolName: 'Decimal',
      type: 'extends',
    }));
    const moneyChunk = result.chunks.find((c) => c.metadata?.symbolIds.includes(moneyClass?.id ?? ''));
    expect(moneyChunk?.metadata?.relationCount).toBe(2);
  });

  it('parses async functions', async () => {
    const content = [
      'async def load_user():',
      '    return None',
    ].join('\n');

    const result = await parser.parse(sourceFile('src/async_app.py'), content);

    expect(result.symbols.some((s) => s.name === 'load_user' && s.kind === 'function')).toBe(true);
    expect(result.parsingMode).toBe('ast');
  });

  it('falls back to simplified parser on error when configured', async () => {
    const simplifiedParser = new SimplifiedParser({ patterns: pythonPatterns, confidence: 0.65 });
    const fallbackParser = new PythonParser({
      fallbackOnError: true,
      simplifiedParser,
    });

    // Force an error by using invalid syntax that still contains a function.
    // We simulate an error by mocking parse to throw, but since we cannot easily
    // mock the tree-sitter instance, we rely on the fallback path being wired.
    const content = 'def broken(\n';

    const result = await fallbackParser.parse(sourceFile('src/broken.py'), content);

    expect(result.parsingMode).toBe('simplified');
    expect(result.confidence).toBe(0.65);
  });
});
