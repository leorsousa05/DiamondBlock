import { describe, expect, it } from 'vitest';
import { SimplifiedParser } from './simplified_parser.js';
import { pythonPatterns } from './language_patterns/python_patterns.js';
import type { SourceFile } from '../application/ports/codebase_scanner.js';

function sourceFile(relativePath: string): SourceFile {
  return { absolutePath: `/tmp/${relativePath}`, relativePath };
}

describe('SimplifiedParser', () => {
  const parser = new SimplifiedParser({ patterns: pythonPatterns, confidence: 0.65 });

  it('can parse Python files', () => {
    expect(parser.canParse(sourceFile('src/app.py'))).toBe(true);
    expect(parser.canParse(sourceFile('src/app.ts'))).toBe(false);
  });

  it('returns empty result for empty file', async () => {
    const result = await parser.parse(sourceFile('src/empty.py'), '');
    expect(result.symbols).toHaveLength(0);
    expect(result.chunks).toHaveLength(0);
    expect(result.parsingMode).toBe('simplified');
    expect(result.confidence).toBe(0.65);
  });

  it('extracts a single function', async () => {
    const content = 'def add(a, b):\n    return a + b\n';
    const result = await parser.parse(sourceFile('src/math.py'), content);

    expect(result.symbols).toHaveLength(1);
    expect(result.symbols[0].name).toBe('add');
    expect(result.symbols[0].kind).toBe('function');
    expect(result.symbols[0].startLine).toBe(1);
    expect(result.symbols[0].endLine).toBe(2);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toContain('def add');
  });

  it('extracts classes and methods', async () => {
    const content = [
      'class Calculator:',
      '    def add(self, a, b):',
      '        return a + b',
      '',
      '    def subtract(self, a, b):',
      '        return a - b',
      '',
      'def helper():',
      '    pass',
    ].join('\n');

    const result = await parser.parse(sourceFile('src/calc.py'), content);

    expect(result.symbols).toHaveLength(4);
    expect(result.symbols.map((s) => s.name)).toEqual(['Calculator', 'add', 'subtract', 'helper']);
    expect(result.symbols[0].kind).toBe('class');
    expect(result.symbols[1].kind).toBe('method');
    expect(result.symbols[3].kind).toBe('function');
  });

  it('captures imports and propagates them to chunks', async () => {
    const content = [
      'import json',
      'from collections import defaultdict',
      '',
      'def process(data):',
      '    return json.loads(data)',
    ].join('\n');

    const result = await parser.parse(sourceFile('src/proc.py'), content);

    expect(result.symbols[0].name).toBe('process');
    expect(result.chunks[0].metadata?.imports).toContain('import json');
    expect(result.chunks[0].metadata?.imports).toContain('from collections import defaultdict');
    expect(result.chunks[0].content).toContain('import json');
  });
});
