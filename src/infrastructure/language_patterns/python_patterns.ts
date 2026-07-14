import type { LanguagePatternSet, SymbolPattern } from '../../application/ports/language_pattern.js';

const functionPattern: SymbolPattern = {
  name: 'function',
  regex: /^def\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  kind: 'function',
  topLevelOnly: true,
};

const methodPattern: SymbolPattern = {
  name: 'method',
  regex: /^\s{4,}def\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(/,
  kind: 'method',
  topLevelOnly: false,
};

const classPattern: SymbolPattern = {
  name: 'class',
  regex: /^\s*class\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|:)/,
  kind: 'class',
  topLevelOnly: true,
};

export const pythonPatterns: LanguagePatternSet = {
  language: 'python',
  fileExtensions: ['py'],
  symbolPatterns: [classPattern, functionPattern, methodPattern],
  importPattern: /^(?:from\s+(?<module>[\w.]+)\s+import|import\s+(?<module>[\w.]+(?:\s*,\s*[\w.]+)*))/,
  isContinuation: (currentLine: string, nextLine: string) => {
    const trimmed = currentLine.trimEnd();
    const nextTrimmed = nextLine.trim();
    if (trimmed.endsWith('\\')) return true;
    const openParens = (trimmed.match(/\(/g) || []).length - (trimmed.match(/\)/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
    const openBraces = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
    return (
      openParens > 0 ||
      openBrackets > 0 ||
      openBraces > 0 ||
      nextTrimmed.startsWith('.') ||
      /:\s*$/.test(trimmed)
    );
  },
};
