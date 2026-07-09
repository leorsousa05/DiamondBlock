export class SmartFallbackChunker {
    maxChunkLines;
    overlapLines;
    constructor(options = {}) {
        this.maxChunkLines = options.maxChunkLines ?? 300;
        this.overlapLines = options.overlapLines ?? 30;
    }
    chunk(file, content, options) {
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
    findNaturalDelimiters(lines) {
        const delimiters = [0];
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
    isBlank(line) {
        return line.trim().length === 0;
    }
    isRegionMarker(line) {
        return /^\/\/\s*(MARK|region|#region|pragma\s+mark)/i.test(line) || /^#\s*region/i.test(line);
    }
    isMarkdownHeading(line) {
        return /^#{1,6}\s+/.test(line);
    }
    isConfigSection(line) {
        return /^\[\s*[^\]]+\s*\]$/.test(line) || /^\[\s*[^\]]+\s*\]\s*$/.test(line);
    }
    findNextNonBlank(lines, start) {
        for (let i = start; i < lines.length; i++) {
            if (!this.isBlank(lines[i]))
                return i;
        }
        return -1;
    }
    splitByDelimiters(file, lines, delimiters, language) {
        const chunks = [];
        let currentStart = delimiters[0];
        for (let i = 1; i < delimiters.length; i++) {
            const end = delimiters[i];
            if (end - currentStart > this.maxChunkLines) {
                chunks.push(...this.splitBySizeFrom(file, lines, currentStart, end, language));
            }
            else {
                chunks.push(this.buildChunk(file, lines, currentStart, end, language));
            }
            currentStart = end;
        }
        return chunks.filter((c) => c.content.trim().length > 0);
    }
    splitBySize(file, lines, language) {
        return this.splitBySizeFrom(file, lines, 0, lines.length, language);
    }
    splitBySizeFrom(file, lines, startOffset, endOffset, language) {
        const chunks = [];
        const step = this.maxChunkLines - this.overlapLines;
        for (let start = startOffset; start < endOffset; start += step) {
            const end = Math.min(start + this.maxChunkLines, endOffset);
            chunks.push(this.buildChunk(file, lines, start, end, language));
            if (end === endOffset)
                break;
        }
        return chunks.filter((c) => c.content.trim().length > 0);
    }
    buildChunk(file, lines, start, end, language) {
        const startLine = start + 1;
        const endLine = end;
        const chunkLines = lines.slice(start, end);
        const header = `// file: ${file.relativePath} lines ${startLine}-${endLine}`;
        const content = `${header}\n${chunkLines.join('\n')}`;
        const metadata = {
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
//# sourceMappingURL=smart_fallback_chunker.js.map