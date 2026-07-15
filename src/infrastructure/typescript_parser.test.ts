import { describe, expect, it } from 'vitest';
import { TypeScriptParser } from './typescript_parser.js';

describe('TypeScriptParser', () => {
  const parser = new TypeScriptParser();
  const file = { absolutePath: '/tmp/example.ts', relativePath: 'src/example.ts' };

  it('parses a simple function', async () => {
    const content = `export function add(a: number, b: number): number {
  return a + b;
}`;

    const result = await parser.parse(file, content);

    expect(result.parsingMode).toBe('ast');
    expect(result.confidence).toBe(0.95);
    expect(result.symbols).toHaveLength(1);
    expect(result.symbols[0].name).toBe('add');
    expect(result.symbols[0].kind).toBe('function');
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toContain('function add');
  });

  it('parses a class with methods', async () => {
    const content = `export class User {
  constructor(public name: string) {}

  greet(): string {
    return \`Hello, ${'name'}\`;
  }
}`;

    const result = await parser.parse(file, content);

    const userClass = result.symbols.find((s) => s.name === 'User');
    expect(userClass).toBeDefined();
    expect(userClass?.kind).toBe('class');
    expect(result.chunks.some((c) => c.content.includes('class User'))).toBe(true);
  });

  it('parses a React component', async () => {
    const tsxFile = { absolutePath: '/tmp/app.tsx', relativePath: 'src/app.tsx' };
    const content = `import React from 'react';

export function App() {
  return <div>Hello</div>;
}`;

    const result = await parser.parse(tsxFile, content);

    const app = result.symbols.find((s) => s.name === 'App');
    expect(app).toBeDefined();
    expect(app?.kind).toBe('component');
    expect(result.chunks[0].metadata?.imports).toContain("import React from 'react';");
  });

  it('parses a hook', async () => {
    const content = `export function useCounter() {
  return { count: 0 };
}`;

    const result = await parser.parse(file, content);

    const hook = result.symbols.find((s) => s.name === 'useCounter');
    expect(hook).toBeDefined();
    expect(hook?.kind).toBe('hook');
  });

  it('parses an interface', async () => {
    const content = `export interface Config {
  port: number;
}`;

    const result = await parser.parse(file, content);

    const config = result.symbols.find((s) => s.name === 'Config');
    expect(config).toBeDefined();
    expect(config?.kind).toBe('interface');
  });

  it('captures import and inheritance relation candidates', async () => {
    const content = `import { Base } from './base';

interface Serializable {}

export class User extends Base implements Serializable {
  greet(): string {
    return 'hello';
  }
}`;

    const result = await parser.parse(file, content);
    const userClass = result.symbols.find((s) => s.name === 'User');

    expect(userClass).toBeDefined();
    expect(result.relations).toContainEqual(expect.objectContaining({
      fromSymbolId: userClass?.id,
      toModuleSpecifier: './base',
      type: 'imports',
    }));
    expect(result.relations).toContainEqual(expect.objectContaining({
      fromSymbolId: userClass?.id,
      toSymbolName: 'Base',
      type: 'extends',
    }));
    expect(result.relations).toContainEqual(expect.objectContaining({
      fromSymbolId: userClass?.id,
      toSymbolName: 'Serializable',
      type: 'implements',
    }));
    const userChunk = result.chunks.find((c) => c.metadata?.symbolIds.includes(userClass?.id ?? ''));
    expect(userChunk?.metadata?.relationCount).toBe(3);
  });

  it('parses default exported functions and enums', async () => {
    const content = `export enum Role {
  Admin = 'admin'
}

export default function createUser() {
  return { role: Role.Admin };
}`;

    const result = await parser.parse(file, content);

    expect(result.symbols.some((s) => s.name === 'Role' && s.kind === 'enum')).toBe(true);
    expect(result.symbols.some((s) => s.name === 'createUser' && s.kind === 'function')).toBe(true);
    expect(result.parsingMode).toBe('ast');
  });

  it('does not emit nested const declarations as separate chunks', async () => {
    const content = `export function createService() {
  return {
    async handle() {
      const items = [];
      const results = [];
      return { items, results };
    }
  };
}`;

    const result = await parser.parse(file, content);

    expect(result.symbols).toHaveLength(1);
    expect(result.symbols[0].name).toBe('createService');
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].content).toContain('function createService');
  });

  it('does not parse unsupported extensions', () => {
    const pyFile = { absolutePath: '/tmp/app.py', relativePath: 'src/app.py' };

    expect(parser.canParse(pyFile)).toBe(false);
  });
});
