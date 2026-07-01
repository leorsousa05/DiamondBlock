import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Memory } from '../domain/memory.js';
import type { SearchResult, VectorIndex } from '../application/ports/vector_index.js';

export interface SqliteVectorIndexOptions {
  dbPath: string;
}

export class SqliteVectorIndex implements VectorIndex {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor(options: SqliteVectorIndexOptions) {
    this.dbPath = options.dbPath;
  }

  private getDb(): Database.Database {
    if (!this.db) {
      this.db = new Database(this.dbPath);
      this.db.loadExtension(sqliteVec.getLoadablePath());
      this.initialize();
    }
    return this.db;
  }

  private initialize(): void {
    const db = this.getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        scope TEXT NOT NULL,
        title TEXT NOT NULL,
        source TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
        memory_id TEXT PRIMARY KEY,
        embedding FLOAT[384]
      );
    `);
  }

  async index(memory: Memory, embedding: number[]): Promise<void> {
    await mkdir(dirname(this.dbPath), { recursive: true });
    const db = this.getDb();

    const insertMemory = db.prepare(`
      INSERT OR REPLACE INTO memories (id, type, scope, title, source)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertVec = db.prepare(`
      INSERT OR REPLACE INTO vec_memories (memory_id, embedding)
      VALUES (?, ?)
    `);

    const vectorJson = JSON.stringify(embedding);

    const transaction = db.transaction(() => {
      insertMemory.run(memory.id, memory.type, memory.scope, memory.title, memory.source);
      insertVec.run(memory.id, vectorJson);
    });

    transaction();
  }

  async search(embedding: number[], limit: number): Promise<SearchResult[]> {
    const db = this.getDb();
    const vectorJson = JSON.stringify(embedding);

    const rows = db
      .prepare(
        `
        SELECT memory_id, distance
        FROM vec_memories
        WHERE embedding MATCH ?
        ORDER BY distance
        LIMIT ?
      `
      )
      .all(vectorJson, limit) as Array<{ memory_id: string; distance: number }>;

    return rows.map((row) => ({
      id: row.memory_id,
      score: 1 - row.distance,
    }));
  }

  async remove(id: string): Promise<void> {
    const db = this.getDb();

    const deleteMemory = db.prepare('DELETE FROM memories WHERE id = ?');
    const deleteVec = db.prepare('DELETE FROM vec_memories WHERE memory_id = ?');

    const transaction = db.transaction(() => {
      deleteMemory.run(id);
      deleteVec.run(id);
    });

    transaction();
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }
}
