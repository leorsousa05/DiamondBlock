import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Scope } from '../domain/scope.js';
export class SqliteVectorIndex {
    db = null;
    dbPath;
    constructor(options) {
        this.dbPath = options.dbPath;
    }
    getDb() {
        if (!this.db) {
            this.db = new Database(this.dbPath);
            this.db.loadExtension(sqliteVec.getLoadablePath());
            this.initialize();
        }
        return this.db;
    }
    initialize() {
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
    async index(item, embedding) {
        await mkdir(dirname(this.dbPath), { recursive: true });
        const db = this.getDb();
        const insertMemory = db.prepare(`
      INSERT OR REPLACE INTO memories (id, type, scope, title, source)
      VALUES (?, ?, ?, ?, ?)
    `);
        const insertVec = db.prepare(`
      INSERT INTO vec_memories (memory_id, embedding)
      VALUES (?, ?)
    `);
        const updateVec = db.prepare(`
      UPDATE vec_memories SET embedding = ? WHERE memory_id = ?
    `);
        const deleteVec = db.prepare(`
      DELETE FROM vec_memories WHERE memory_id = ?
    `);
        const vectorJson = JSON.stringify(embedding);
        const transaction = db.transaction(() => {
            insertMemory.run(item.id, item.type, item.scope, item.title, item.source);
            const existing = db.prepare('SELECT 1 FROM vec_memories WHERE memory_id = ?').get(item.id);
            if (existing) {
                try {
                    updateVec.run(vectorJson, item.id);
                }
                catch {
                    deleteVec.run(item.id);
                    insertVec.run(item.id, vectorJson);
                }
            }
            else {
                insertVec.run(item.id, vectorJson);
            }
        });
        transaction();
    }
    async indexBatch(items) {
        if (items.length === 0)
            return;
        await mkdir(dirname(this.dbPath), { recursive: true });
        const db = this.getDb();
        const insertMemory = db.prepare(`
      INSERT OR REPLACE INTO memories (id, type, scope, title, source)
      VALUES (?, ?, ?, ?, ?)
    `);
        const insertVec = db.prepare(`
      INSERT INTO vec_memories (memory_id, embedding)
      VALUES (?, ?)
    `);
        const updateVec = db.prepare(`
      UPDATE vec_memories SET embedding = ? WHERE memory_id = ?
    `);
        const deleteVec = db.prepare(`
      DELETE FROM vec_memories WHERE memory_id = ?
    `);
        const selectVec = db.prepare('SELECT 1 FROM vec_memories WHERE memory_id = ?');
        const transaction = db.transaction(() => {
            for (const { item, embedding } of items) {
                insertMemory.run(item.id, item.type, item.scope, item.title, item.source);
                const vectorJson = JSON.stringify(embedding);
                const existing = selectVec.get(item.id);
                if (existing) {
                    try {
                        updateVec.run(vectorJson, item.id);
                    }
                    catch {
                        deleteVec.run(item.id);
                        insertVec.run(item.id, vectorJson);
                    }
                }
                else {
                    insertVec.run(item.id, vectorJson);
                }
            }
        });
        transaction();
    }
    async search(embedding, limit, options) {
        const db = this.getDb();
        const vectorJson = JSON.stringify(embedding);
        const scope = options?.scope ? Scope.normalize(options.scope) : undefined;
        let rows;
        if (scope) {
            const maxK = 4096;
            let k = Math.min(limit * 10, maxK);
            let attempts = 0;
            const maxAttempts = 3;
            do {
                rows = db
                    .prepare(`
          SELECT vm.memory_id, vm.distance
          FROM vec_memories AS vm
          JOIN memories AS m ON m.id = vm.memory_id
          WHERE vm.embedding MATCH ?
            AND k = ?
            AND m.scope = ?
          ORDER BY vm.distance
          LIMIT ?
        `)
                    .all(vectorJson, k, scope, limit);
                if (rows.length >= limit || k >= maxK)
                    break;
                k = Math.min(k * 4, maxK);
                attempts++;
            } while (rows.length < limit && attempts < maxAttempts);
        }
        else {
            rows = db
                .prepare(`
          SELECT memory_id, distance
          FROM vec_memories
          WHERE embedding MATCH ?
          ORDER BY distance
          LIMIT ?
        `)
                .all(vectorJson, limit);
        }
        return rows.map((row) => ({
            id: row.memory_id,
            score: 1 - row.distance,
        }));
    }
    async remove(id) {
        const db = this.getDb();
        const deleteMemory = db.prepare('DELETE FROM memories WHERE id = ?');
        const deleteVec = db.prepare('DELETE FROM vec_memories WHERE memory_id = ?');
        const transaction = db.transaction(() => {
            deleteMemory.run(id);
            deleteVec.run(id);
        });
        transaction();
    }
    async removeBatch(ids) {
        if (ids.length === 0)
            return;
        const db = this.getDb();
        const deleteMemory = db.prepare('DELETE FROM memories WHERE id = ?');
        const deleteVec = db.prepare('DELETE FROM vec_memories WHERE memory_id = ?');
        const transaction = db.transaction(() => {
            for (const id of ids) {
                deleteMemory.run(id);
                deleteVec.run(id);
            }
        });
        transaction();
    }
    async close() {
        this.db?.close();
        this.db = null;
    }
}
//# sourceMappingURL=sqlite_vector_index.js.map