import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { FileCodebaseScanner } from './file_codebase_scanner.js';

describe('FileCodebaseScanner', () => {
  let root: string;
  let scanner: FileCodebaseScanner;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'db-scan-'));
    scanner = new FileCodebaseScanner();
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function write(relativePath: string, content: string): Promise<void> {
    const absolutePath = join(root, relativePath);
    await mkdir(absolutePath.split('/').slice(0, -1).join('/'), { recursive: true });
    await writeFile(absolutePath, content, 'utf-8');
  }

  it('discovers code files', async () => {
    await write('src/foo.ts', 'export const foo = 1;');
    await write('src/bar.js', 'module.exports = 1;');
    await write('README.md', '# readme');

    const files = await scanner.scan({ rootPath: root });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/foo.ts');
    expect(paths).toContain('src/bar.js');
    expect(paths).toContain('README.md');
  });

  it('ignores node_modules and dist by default', async () => {
    await write('src/index.ts', 'x');
    await write('node_modules/lib/index.ts', 'x');
    await write('dist/index.js', 'x');

    const files = await scanner.scan({ rootPath: root });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('node_modules/lib/index.ts');
    expect(paths).not.toContain('dist/index.js');
  });

  it('respects .gitignore patterns', async () => {
    await write('.gitignore', '*.log\nignored/\n');
    await write('src/index.ts', 'x');
    await write('debug.log', 'x');
    await write('ignored/file.ts', 'x');

    const files = await scanner.scan({ rootPath: root });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('debug.log');
    expect(paths).not.toContain('ignored/file.ts');
  });

  it('filters by includeExtensions', async () => {
    await write('src/index.ts', 'x');
    await write('src/index.js', 'x');
    await write('README.md', 'x');

    const files = await scanner.scan({ rootPath: root, includeExtensions: ['ts'] });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('src/index.js');
    expect(paths).not.toContain('README.md');
  });

  it('ignores files larger than maxFileSizeBytes', async () => {
    await write('small.ts', 'x');
    await write('huge.ts', 'x'.repeat(100));

    const files = await scanner.scan({ rootPath: root, maxFileSizeBytes: 50 });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('small.ts');
    expect(paths).not.toContain('huge.ts');
  });

  it('throws when root path cannot be accessed', async () => {
    await expect(scanner.scan({ rootPath: '/definitely/not/existent/path' })).rejects.toThrow(
      'Cannot access codebase root path'
    );
  });

  it('returns absolute and relative paths', async () => {
    await write('src/foo.ts', 'x');

    const files = await scanner.scan({ rootPath: root });

    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe('src/foo.ts');
    expect(files[0].absolutePath).toBe(join(root, 'src/foo.ts'));
  });

  it('discovers extended web and config extensions', async () => {
    await write('src/app.tsx', 'export default function App() {}');
    await write('src/app.jsx', 'export default function App() {}');
    await write('src/config.xml', '<root/>');
    await write('src/schema.xsd', '<schema/>');

    const files = await scanner.scan({ rootPath: root });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('src/app.tsx');
    expect(paths).toContain('src/app.jsx');
    expect(paths).toContain('src/config.xml');
    expect(paths).toContain('src/schema.xsd');
  });

  it('discovers special config files by name', async () => {
    await write('.eslintrc', '{}');
    await write('.prettierrc', '{}');
    await write('.gitignore', 'node_modules\n');
    await write('Makefile', 'all:\n');
    await write('Dockerfile', 'FROM node\n');

    const files = await scanner.scan({ rootPath: root });
    const paths = files.map((f) => f.relativePath);

    expect(paths).toContain('.eslintrc');
    expect(paths).toContain('.prettierrc');
    expect(paths).toContain('.gitignore');
    expect(paths).toContain('Makefile');
    expect(paths).toContain('Dockerfile');
  });
});
