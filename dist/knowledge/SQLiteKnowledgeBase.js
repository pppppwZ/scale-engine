// SCALE Engine — SQLite Knowledge Base
// Persistent version of KnowledgeBase using better-sqlite3
// Design ref: docs/03-CORE-MODULES.md §3.4
import Database from 'better-sqlite3';
import { logger } from '../core/logger.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const KB_SCHEMA = `
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  tags            TEXT NOT NULL DEFAULT '[]',
  content_ref     TEXT NOT NULL DEFAULT '',
  embedding_id    TEXT,
  relevance       REAL NOT NULL DEFAULT 0.5,
  access_count    INTEGER NOT NULL DEFAULT 0,
  last_accessed   INTEGER,
  verified        INTEGER NOT NULL DEFAULT 0,
  verified_by     TEXT,
  verified_at     INTEGER,
  created_at      INTEGER NOT NULL,
  source_artifact TEXT
);

CREATE INDEX IF NOT EXISTS idx_kb_type ON knowledge_entries(type);
CREATE INDEX IF NOT EXISTS idx_kb_relevance ON knowledge_entries(relevance);
CREATE INDEX IF NOT EXISTS idx_kb_verified ON knowledge_entries(verified);
CREATE INDEX IF NOT EXISTS idx_kb_created ON knowledge_entries(created_at);
`;
export class SQLiteKnowledgeBase {
    constructor(eventBus, opts = {}) {
        this.eventBus = eventBus;
        this.seq = 0;
        const dbPath = opts.dbPath ?? '.scale/knowledge.db';
        mkdirSync(dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('busy_timeout = 5000');
        this.db.exec(KB_SCHEMA);
        // Restore seq from max id
        const maxRow = this.db.prepare('SELECT id FROM knowledge_entries ORDER BY created_at DESC LIMIT 1').get();
        if (maxRow) {
            const parts = maxRow.id.split('-');
            this.seq = parseInt(parts[parts.length - 1], 10) || 0;
        }
    }
    async add(input) {
        const entry = {
            ...input,
            id: this.generateId(),
            createdAt: Date.now(),
            accessCount: 0,
            relevance: 0.5,
        };
        this.db.prepare(`
      INSERT INTO knowledge_entries
        (id, type, title, tags, content_ref, embedding_id, relevance,
         access_count, last_accessed, verified, verified_by, verified_at,
         created_at, source_artifact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entry.id, entry.type, entry.title, JSON.stringify(entry.tags), entry.contentRef, entry.embeddingId ?? null, entry.relevance, entry.accessCount, entry.lastAccessed ?? null, entry.verified ? 1 : 0, entry.verifiedBy ?? null, entry.verifiedAt ?? null, entry.createdAt, entry.sourceArtifact ?? null);
        this.eventBus.emit('lesson.proposed', { lessonId: entry.id }, { artifactId: input.sourceArtifact });
        return entry;
    }
    async recall(query) {
        const conditions = ['1=1'];
        const params = [];
        if (query.type) {
            const types = Array.isArray(query.type) ? query.type : [query.type];
            conditions.push(`type IN (${types.map(() => '?').join(',')})`);
            params.push(...types);
        }
        if (query.tags && query.tags.length > 0) {
            for (const tag of query.tags) {
                conditions.push(`tags LIKE ?`);
                params.push(`%"${tag}"%`);
            }
        }
        if (query.minRelevance !== undefined) {
            conditions.push('relevance >= ?');
            params.push(query.minRelevance);
        }
        if (query.verifiedOnly) {
            conditions.push('verified = 1');
        }
        const limit = query.limit ?? 10;
        const sql = `SELECT * FROM knowledge_entries WHERE ${conditions.join(' AND ')} ORDER BY relevance DESC LIMIT ?`;
        params.push(limit);
        const rows = this.db.prepare(sql).all(...params);
        return rows.map((r) => this.fromRow(r));
    }
    async recallByVector(text, topK) {
        // Qdrant integration placeholder — falls back to recall
        logger.debug({ text, topK }, 'recallByVector (SQLite fallback to recall)');
        return this.recall({ verifiedOnly: true, limit: topK });
    }
    async markHelpful(id, sessionId) {
        const row = this.db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(id);
        if (!row)
            return;
        const newRelevance = Math.min(1, row.relevance + 0.05);
        const newCount = row.access_count + 1;
        const now = Date.now();
        this.db.prepare('UPDATE knowledge_entries SET relevance = ?, access_count = ?, last_accessed = ? WHERE id = ?').run(newRelevance, newCount, now, id);
        this.eventBus.emit('lesson.helpful', { lessonId: id }, { sessionId });
    }
    async markUseless(id, sessionId) {
        const row = this.db.prepare('SELECT * FROM knowledge_entries WHERE id = ?').get(id);
        if (!row)
            return;
        const newRelevance = Math.max(0.05, row.relevance - 0.1);
        this.db.prepare('UPDATE knowledge_entries SET relevance = ? WHERE id = ?').run(newRelevance, id);
        this.eventBus.emit('lesson.useless', { lessonId: id }, { sessionId });
    }
    async verify(id, verifiedBy) {
        const now = Date.now();
        const result = this.db.prepare('UPDATE knowledge_entries SET verified = 1, verified_by = ?, verified_at = ? WHERE id = ?').run(verifiedBy, now, id);
        if (result.changes > 0) {
            this.eventBus.emit('lesson.approved', { lessonId: id, verifiedBy });
        }
    }
    async decay() {
        const DAY = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const rows = this.db.prepare('SELECT id, relevance, last_accessed FROM knowledge_entries').all();
        const stmt = this.db.prepare('UPDATE knowledge_entries SET relevance = ? WHERE id = ?');
        const updateAll = this.db.transaction(() => {
            for (const row of rows) {
                const days = row.last_accessed ? (now - row.last_accessed) / DAY : 90;
                const recency = Math.exp(-days / 30);
                const newRelevance = Math.max(0.05, row.relevance * 0.95 + recency * 0.05);
                stmt.run(newRelevance, row.id);
            }
        });
        updateAll();
    }
    /** Close database connection */
    close() {
        this.db.close();
    }
    /** Get stats */
    stats() {
        const entryCount = this.db.prepare('SELECT COUNT(*) as c FROM knowledge_entries').get().c;
        const verifiedCount = this.db.prepare('SELECT COUNT(*) as c FROM knowledge_entries WHERE verified = 1').get().c;
        const rows = this.db.prepare('SELECT type, COUNT(*) as c FROM knowledge_entries GROUP BY type').all();
        const byType = {};
        for (const r of rows)
            byType[r.type] = r.c;
        return { entryCount, verifiedCount, byType };
    }
    generateId() {
        this.seq = (this.seq + 1) % 10000;
        return `KB-${Date.now()}-${this.seq.toString().padStart(4, '0')}`;
    }
    fromRow(row) {
        return {
            id: row.id,
            type: row.type,
            title: row.title,
            tags: JSON.parse(row.tags),
            contentRef: row.content_ref,
            embeddingId: row.embedding_id ?? undefined,
            relevance: row.relevance,
            accessCount: row.access_count,
            lastAccessed: row.last_accessed ?? undefined,
            verified: row.verified === 1,
            verifiedBy: row.verified_by ?? undefined,
            verifiedAt: row.verified_at ?? undefined,
            createdAt: row.created_at,
            sourceArtifact: row.source_artifact ?? undefined,
        };
    }
}
//# sourceMappingURL=SQLiteKnowledgeBase.js.map