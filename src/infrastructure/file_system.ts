import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export async function walkDirectory(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await walkDirectory(path)));
      } else {
        files.push(path);
      }
    }

    return files;
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }
}
