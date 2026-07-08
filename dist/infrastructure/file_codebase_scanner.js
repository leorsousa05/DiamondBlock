import { access, constants, readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
const DEFAULT_INCLUDE_EXTENSIONS = new Set([
    // JavaScript / TypeScript ecosystem
    'ts',
    'tsx',
    'js',
    'jsx',
    'mjs',
    'cjs',
    'mts',
    'cts',
    // Java / JVM
    'java',
    'kt',
    'kts',
    'groovy',
    'scala',
    'jsp',
    'jspx',
    // Python
    'py',
    'pyi',
    // Systems
    'c',
    'cpp',
    'cc',
    'cxx',
    'h',
    'hpp',
    'rs',
    'go',
    // .NET
    'cs',
    'fs',
    'fsx',
    'vb',
    // Mobile / Apple
    'swift',
    'm',
    'mm',
    // Web
    'html',
    'htm',
    'xhtml',
    'css',
    'scss',
    'sass',
    'less',
    'vue',
    'svelte',
    'astro',
    // Ruby / PHP / Perl
    'rb',
    'erb',
    'php',
    'phtml',
    'pl',
    'pm',
    // Shell / scripts
    'sh',
    'bash',
    'zsh',
    'fish',
    'ps1',
    'psm1',
    'bat',
    'cmd',
    // Config / data
    'json',
    'jsonc',
    'json5',
    'yaml',
    'yml',
    'toml',
    'xml',
    'xsd',
    'xsl',
    'xslt',
    'ini',
    'cfg',
    'conf',
    'config',
    'env',
    'properties',
    // Docs
    'md',
    'mdx',
    'markdown',
    'rst',
    'txt',
    // Database
    'sql',
    // Docker
    'dockerfile',
]);
const ALWAYS_IGNORED_DIRS = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'out',
    'coverage',
    '.venv',
    'venv',
    'target',
    '.next',
    '.nuxt',
    '.cache',
    'vendor',
    '__pycache__',
    '.turbo',
    '.svelte-kit',
    '.vercel',
    'logs',
]);
const DEFAULT_MAX_FILE_SIZE_BYTES = 1024 * 1024;
const SPECIAL_FILE_NAMES = [
    'dockerfile',
    '.eslintrc',
    '.prettierrc',
    '.babelrc',
    '.nycrc',
    '.editorconfig',
    '.gitattributes',
    '.gitignore',
    'makefile',
    'rakefile',
    'gemfile',
];
const SPECIAL_FILE_SET = new Set(SPECIAL_FILE_NAMES);
const SPECIAL_FILE_EXTENSIONS = new Set(SPECIAL_FILE_NAMES);
export class FileCodebaseScanner {
    async scan(options) {
        const rootPath = options.rootPath;
        await this.validateRootPath(rootPath);
        const includeExtensions = options.includeExtensions
            ? new Set(options.includeExtensions.map((e) => e.toLowerCase().replace(/^\./, '')))
            : DEFAULT_INCLUDE_EXTENSIONS;
        const maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;
        const respectGitignore = options.respectGitignore ?? true;
        const gitignoreRules = respectGitignore ? await this.loadGitignoreRules(rootPath) : [];
        const results = [];
        await this.walk(rootPath, rootPath, includeExtensions, maxFileSizeBytes, gitignoreRules, results);
        return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    }
    async validateRootPath(rootPath) {
        try {
            await access(rootPath, constants.R_OK | constants.X_OK);
        }
        catch {
            throw new Error(`Cannot access codebase root path: ${rootPath}`);
        }
    }
    async walk(dir, rootPath, includeExtensions, maxFileSizeBytes, gitignoreRules, results) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = join(dir, entry.name);
            const relativePath = relative(rootPath, absolutePath);
            const normalizedRelative = relativePath.split(sep).join('/');
            if (entry.isDirectory()) {
                if (ALWAYS_IGNORED_DIRS.has(entry.name))
                    continue;
                if (this.isIgnored(normalizedRelative, true, gitignoreRules))
                    continue;
                await this.walk(absolutePath, rootPath, includeExtensions, maxFileSizeBytes, gitignoreRules, results);
                continue;
            }
            if (!entry.isFile())
                continue;
            if (this.isIgnored(normalizedRelative, false, gitignoreRules))
                continue;
            const ext = this.getExtension(entry.name);
            const lowerFileName = entry.name.toLowerCase();
            const isSpecialFile = SPECIAL_FILE_SET.has(lowerFileName);
            if (!isSpecialFile && !includeExtensions.has(ext))
                continue;
            const fileStat = await stat(absolutePath);
            if (fileStat.size > maxFileSizeBytes)
                continue;
            results.push({
                absolutePath,
                relativePath: normalizedRelative,
            });
        }
    }
    getExtension(fileName) {
        const lower = fileName.toLowerCase();
        if (SPECIAL_FILE_EXTENSIONS.has(lower))
            return lower;
        const dotIndex = lower.lastIndexOf('.');
        return dotIndex > 0 ? lower.slice(dotIndex + 1) : '';
    }
    async loadGitignoreRules(rootPath) {
        try {
            const content = await readFile(join(rootPath, '.gitignore'), 'utf-8');
            return content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0 && !line.startsWith('#'))
                .map((line) => this.parseGitignoreLine(line));
        }
        catch {
            return [];
        }
    }
    parseGitignoreLine(line) {
        let pattern = line;
        const isNegated = pattern.startsWith('!');
        if (isNegated)
            pattern = pattern.slice(1);
        const isDirectory = pattern.endsWith('/');
        if (isDirectory)
            pattern = pattern.slice(0, -1);
        const anchored = pattern.startsWith('/');
        if (anchored)
            pattern = pattern.slice(1);
        return { pattern, isDirectory, isNegated, anchored };
    }
    isIgnored(relativePath, isDirectory, rules) {
        let ignored = false;
        for (const rule of rules) {
            const matches = this.ruleMatches(relativePath, isDirectory, rule);
            if (!matches)
                continue;
            ignored = !rule.isNegated;
        }
        return ignored;
    }
    ruleMatches(relativePath, isDirectory, rule) {
        if (rule.isDirectory && !isDirectory)
            return false;
        const parts = relativePath.split('/');
        const fileName = parts[parts.length - 1];
        if (rule.anchored) {
            return this.matchPattern(relativePath, rule.pattern);
        }
        if (rule.pattern.includes('/')) {
            return this.matchPattern(relativePath, rule.pattern);
        }
        for (const part of parts) {
            if (this.matchPattern(part, rule.pattern))
                return true;
        }
        return false;
    }
    matchPattern(value, pattern) {
        const regex = this.gitignorePatternToRegex(pattern);
        return regex.test(value);
    }
    gitignorePatternToRegex(pattern) {
        let regex = '';
        let i = 0;
        while (i < pattern.length) {
            const char = pattern[i];
            if (char === '*') {
                if (pattern[i + 1] === '*') {
                    regex += '.*';
                    i += 2;
                }
                else {
                    regex += '[^/]*';
                    i++;
                }
            }
            else if (char === '?') {
                regex += '[^/]';
                i++;
            }
            else if (char === '.') {
                regex += '\\.';
                i++;
            }
            else {
                regex += char;
                i++;
            }
        }
        return new RegExp(`^${regex}$`);
    }
}
//# sourceMappingURL=file_codebase_scanner.js.map