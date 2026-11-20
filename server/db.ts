import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err.message);
});

/** Run a parameterised query and return the result rows. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query<T>(sql, params);
  } finally {
    client.release();
  }
}

/** Bootstrap all tables (runs at server start). */
export async function migrate(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT   NOT NULL UNIQUE CHECK(char_length(email) <= 254),
      password   TEXT   NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      id           SERIAL PRIMARY KEY,
      email        TEXT    NOT NULL,
      succeeded    BOOLEAN NOT NULL DEFAULT FALSE,
      attempted_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id         SERIAL PRIMARY KEY,
      owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title      TEXT    NOT NULL DEFAULT 'Untitled document'
                         CHECK(char_length(title) >= 1 AND char_length(title) <= 255),
      content    TEXT    NOT NULL DEFAULT '{}',
      storage_path TEXT  DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS access_grants (
      id              SERIAL PRIMARY KEY,
      document_id     INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      collaborator_id INTEGER NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
      permission      TEXT    NOT NULL DEFAULT 'edit',
      granted_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(document_id, collaborator_id)
    );

    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti        TEXT PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL
    );

    -- Add storage_path to existing tables that pre-date this column
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT NULL;
  `);
}

export default pool;
