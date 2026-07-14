import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { CodeSymbol, SymbolKind } from '../application/ports/code_parser.js';

export interface BuildChunkOptions {
  file: SourceFile;
  lines: string[];
  symbol: CodeSymbol;
  language: string;
  imports: string[];
  parsingMode: 'ast' | 'simplified' | 'fallback';
  confidence: number;
  supportsGraph: boolean;
  supportsSymbols: boolean;
}

export function buildChunk(options: BuildChunkOptions): CodeChunkInput {
  const { file, lines, symbol, language, imports, parsingMode, confidence, supportsGraph, supportsSymbols } = options;
  const chunkLines = lines.slice(symbol.startLine - 1, symbol.endLine);
  const body = chunkLines.join('\n');
  const header = `// file: ${file.relativePath} lines ${symbol.startLine}-${symbol.endLine} symbols: ${symbol.id}`;
  const importBlock = imports.length > 0 ? `${imports.join('\n')}\n\n` : '';
  const content = `${header}\n${importBlock}${body}`;

  return {
    filePath: file.relativePath,
    startLine: symbol.startLine,
    endLine: symbol.endLine,
    language,
    content,
    metadata: {
      parsingMode,
      confidence,
      supportsGraph,
      supportsSymbols,
      language,
      imports,
      symbolIds: [symbol.id],
      chunkType: symbol.kind,
    },
  };
}

export function buildChunks(options: Omit<BuildChunkOptions, 'symbol'> & { symbols: CodeSymbol[] }): CodeChunkInput[] {
  if (options.symbols.length === 0) {
    return [];
  }

  return options.symbols.map((symbol) =>
    buildChunk({
      ...options,
      symbol,
    })
  );
}

export function buildSignature(line: string | undefined, name: string, kind: SymbolKind): string | undefined {
  if (!line) return undefined;
  const trimmed = line.trim();

  if ((kind === 'function' || kind === 'method') && /^\s*def\s+/.test(trimmed)) {
    return trimmed.replace(/\s*:\s*$/, '');
  }

  if (kind === 'class' && /^\s*class\s+/.test(trimmed)) {
    return trimmed.replace(/\s*:\s*$/, '');
  }

  return undefined;
}

export function buildSymbolId(filePath: string, name: string, startLine: number): string {
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
