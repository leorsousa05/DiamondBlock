import { describe, expect, it } from 'vitest';
import { pythonPatterns } from './python_patterns.js';

describe('pythonPatterns', () => {
  it('matches top-level functions', () => {
    const line = 'def calculate_tax(income: float) -> float:';
    const pattern = pythonPatterns.symbolPatterns.find((p) => p.name === 'function');
    expect(pattern).toBeDefined();
    const regex = new RegExp(pattern!.regex.source, pattern!.regex.flags.includes('g') ? pattern!.regex.flags : `${pattern!.regex.flags}g`);
    const match = regex.exec(line);
    expect(match?.groups?.name).toBe('calculate_tax');
  });

  it('matches classes', () => {
    const line = 'class TaxCalculator(BaseCalculator):';
    const pattern = pythonPatterns.symbolPatterns.find((p) => p.name === 'class');
    expect(pattern).toBeDefined();
    const regex = new RegExp(pattern!.regex.source, pattern!.regex.flags.includes('g') ? pattern!.regex.flags : `${pattern!.regex.flags}g`);
    const match = regex.exec(line);
    expect(match?.groups?.name).toBe('TaxCalculator');
  });

  it('matches methods', () => {
    const line = '    def calculate(self, income):';
    const pattern = pythonPatterns.symbolPatterns.find((p) => p.name === 'method');
    expect(pattern).toBeDefined();
    const regex = new RegExp(pattern!.regex.source, pattern!.regex.flags.includes('g') ? pattern!.regex.flags : `${pattern!.regex.flags}g`);
    const match = regex.exec(line);
    expect(match?.groups?.name).toBe('calculate');
  });

  it('does not match functions as methods', () => {
    const line = '    def helper():';
    const functionPattern = pythonPatterns.symbolPatterns.find((p) => p.name === 'function');
    const regex = new RegExp(functionPattern!.regex.source, functionPattern!.regex.flags.includes('g') ? functionPattern!.regex.flags : `${functionPattern!.regex.flags}g`);
    expect(regex.exec(line)).toBeNull();
  });

  it('matches import statements', () => {
    expect(pythonPatterns.importPattern.test('import json')).toBe(true);
    expect(pythonPatterns.importPattern.test('import os, sys')).toBe(true);
    expect(pythonPatterns.importPattern.test('from collections import defaultdict')).toBe(true);
  });

  it('does not match non-import lines', () => {
    expect(pythonPatterns.importPattern.test('def foo():')).toBe(false);
    expect(pythonPatterns.importPattern.test('# import json')).toBe(false);
  });

  it('recognizes .py extension', () => {
    expect(pythonPatterns.fileExtensions).toContain('py');
  });
});
