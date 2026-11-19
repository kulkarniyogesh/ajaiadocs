import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const isTest = process.env.NODE_ENV === 'test';

function createDb(): Database.Database {
  if (isTest) {
    return new Database(':memory:');
  }

  // ESM-compatible __dirname equivalent
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const dataDir = resolve(__dirname, '..', 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, 'docs.db');
  return new Database(dbPath);
}

const db: DatabaseType = createDb();

// Enable foreign key enforcement and WAL mode for better concurrent reads
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Run all DDL in a single transaction for atomicity
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE CHECK(length(email) <= 254),
    password   TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT    NOT NULL,
    succeeded    INTEGER NOT NULL DEFAULT 0,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL DEFAULT 'Untitled document'
                       CHECK(length(title) >= 1 AND length(title) <= 255),
    content    TEXT    NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS access_grants (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    collaborator_id INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    permission      TEXT    NOT NULL DEFAULT 'edit',
    granted_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, collaborator_id)
  );

  CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti        TEXT     PRIMARY KEY,
    expires_at DATETIME NOT NULL
  );
`);

export default db;
