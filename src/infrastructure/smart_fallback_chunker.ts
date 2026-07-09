import type { SourceFile } from '../application/ports/codebase_scanner.js';
import type { CodeChunkInput } from '../application/ports/code_chunker.js';
import type { ChunkMetadata } from '../application/ports/code_parser.js';

export interface SmartFallbackChunkerOptions {
  maxChunkLines?: number;
  overlapLines?: number;
  language?: string;
}

export class SmartFallbackChunker {
  private readonly maxChunkLines: number;
  private readonly overlapLines: number;

  constructor(options: SmartFallbackChunkerOptions = {}) {
    this.maxChunkLines = options.maxChunkLines ?? 300;
    this.overlapLines = options.overlapLines ?? 30;
  }

  chunk(file: SourceFile, content: string, options?: SmartFallbackChunkerOptions): CodeChunkInput[] {
    const language = options?.language ?? 'unknown';
    const lines = content.split('\n');

    if (lines.length === 1 && lines[0].length === 0) {
      return [];
    }

    if (lines.length === 0) {
      return [];
    }

    const delimiters = this.findNaturalDelimiters(lines);

    if (delimiters.length > 1) {
      return this.splitByDelimiters(file, lines, delimiters, language);
    }

    return this.splitBySize(file, lines, language);
  }

  private findNaturalDelimiters(lines: string[]): number[] {
    const delimiters: number[] = [0];
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!inBlockComment && (trimmed.startsWith('/*') || trimmed.startsWith('/**'))) {
        inBlockComment = !trimmed.endsWith('*/');
        if (i > 0 && this.isBlank(lines[i - 1])) {
          delimiters.push(i);
        }
        continue;
      }

      if (inBlockComment) {
        if (trimmed.endsWith('*/')) {
          inBlockComment = false;
        }
        continue;
      }

      if (this.isRegionMarker(trimmed) || this.isMarkdownHeading(trimmed) || this.isConfigSection(trimmed)) {
        delimiters.push(i);
        continue;
      }

      if (i > 0 && this.isBlank(line) && !this.isBlank(lines[i - 1])) {
        const nextNonBlank = this.findNextNonBlank(lines, i);
        if (nextNonBlank !== -1 && nextNonBlank - i >= 1) {
          delimiters.push(nextNonBlank);
        }
      }
    }

    delimiters.push(lines.length);
    return [...new Set(delimiters)].sort((a, b) => a - b);
  }

  private isBlank(line: string): boolean {
    return line.trim().length === 0;
  }

  private isRegionMarker(line: string): boolean {
    return /^\/\/\s*(MARK|region|#region|pragma\s+mark)/i.test(line) || /^#\s*region/i.test(line);
  }

  private isMarkdownHeading(line: string): boolean {
    return /^#{1,6}\s+/.test(line);
  }

  private isConfigSection(line: string): boolean {
    return /^\[\s*[^\]]+\s*\]$/.test(line) || /^\[\s*[^\]]+\s*\]\s*$/.test(line);
  }

  private findNextNonBlank(lines: string[], start: number): number {
    for (let i = start; i < lines.length; i++) {
      if (!this.isBlank(lines[i])) return i;
    }
    return -1;
  }

  private splitByDelimiters(
    file: SourceFile,
    lines: string[],
    delimiters: number[],
    language: string
  ): CodeChunkInput[] {
    const chunks: CodeChunkInput[] = [];
    let currentStart = delimiters[0];

    for (let i = 1; i < delimiters.length; i++) {
      const end = delimiters[i];

      if (end - currentStart > this.maxChunkLines) {
        chunks.push(...this.splitBySizeFrom(file, lines, currentStart, end, language));
      } else {
        chunks.push(this.buildChunk(file, lines, currentStart, end, language));
      }

      currentStart = end;
    }

    return chunks.filter((c) => c.content.trim().length > 0);
  }

  private splitBySize(file: SourceFile, lines: string[], language: string): CodeChunkInput[] {
    return this.splitBySizeFrom(file, lines, 0, lines.length, language);
  }

  private splitBySizeFrom(
    file: SourceFile,
    lines: string[],
    startOffset: number,
    endOffset: number,
    language: string
  ): CodeChunkInput[] {
    const chunks: CodeChunkInput[] = [];
    const step = this.maxChunkLines - this.overlapLines;

    for (let start = startOffset; start < endOffset; start += step) {
      const end = Math.min(start + this.maxChunkLines, endOffset);
      chunks.push(this.buildChunk(file, lines, start, end, language));
      if (end === endOffset) break;
    }

    return chunks.filter((c) => c.content.trim().length > 0);
  }

  private buildChunk(
    file: SourceFile,
    lines: string[],
    start: number,
    end: number,
    language: string
  ): CodeChunkInput {
    const startLine = start + 1;
    const endLine = end;
    const chunkLines = lines.slice(start, end);
    const header = `// file: ${file.relativePath} lines ${startLine}-${endLine}`;
    const content = `${header}\n${chunkLines.join('\n')}`;

    const metadata: ChunkMetadata = {
      parsingMode: 'fallback',
      confidence: 0.35,
      supportsGraph: false,
      supportsSymbols: false,
      language,
      imports: [],
      symbolIds: [],
    };

    return {
      filePath: file.relativePath,
      startLine,
      endLine,
      language,
      content,
      metadata,
    };
  }
}
