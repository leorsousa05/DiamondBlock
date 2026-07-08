function detectLanguage(filePath) {
    const parts = filePath.split('.');
    const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    const languageMap = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        py: 'python',
        rs: 'rust',
        go: 'go',
        java: 'java',
        kt: 'kotlin',
        kts: 'kotlin',
        rb: 'ruby',
        php: 'php',
        c: 'c',
        cpp: 'cpp',
        cc: 'cpp',
        cxx: 'cpp',
        h: 'c',
        hpp: 'cpp',
        cs: 'csharp',
        swift: 'swift',
        md: 'markdown',
        yml: 'yaml',
        yaml: 'yaml',
        json: 'json',
        toml: 'toml',
        html: 'html',
        css: 'css',
        scss: 'scss',
        sql: 'sql',
        sh: 'bash',
        bash: 'bash',
        zsh: 'bash',
        ps1: 'powershell',
        dockerfile: 'dockerfile',
    };
    return languageMap[ext] ?? ext ?? 'unknown';
}
export class LineCodeChunker {
    async chunk(file, content, options) {
        const chunkSizeLines = options?.chunkSizeLines ?? 50;
        const overlapLines = options?.overlapLines ?? 10;
        if (chunkSizeLines <= 0) {
            throw new Error('chunkSizeLines must be greater than 0');
        }
        if (overlapLines < 0 || overlapLines >= chunkSizeLines) {
            throw new Error('overlapLines must be between 0 and chunkSizeLines - 1');
        }
        const lines = content.split('\n');
        const language = detectLanguage(file.relativePath);
        const chunks = [];
        const step = chunkSizeLines - overlapLines;
        for (let startLine = 1; startLine <= lines.length; startLine += step) {
            const endLine = Math.min(startLine + chunkSizeLines - 1, lines.length);
            const chunkLines = lines.slice(startLine - 1, endLine);
            const header = `// file: ${file.relativePath} lines ${startLine}-${endLine}`;
            const chunkContent = `${header}\n${chunkLines.join('\n')}`;
            chunks.push({
                filePath: file.relativePath,
                startLine,
                endLine,
                language,
                content: chunkContent,
            });
            if (endLine === lines.length)
                break;
        }
        return chunks;
    }
}
//# sourceMappingURL=line_code_chunker.js.map