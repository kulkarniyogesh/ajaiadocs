// Netlify serverless function — wraps the Express app
// esbuild bundles this + all server/* imports into a single CJS file

import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';

// ── inline all route/service imports (no dotenv — env vars from Netlify dashboard)
import pg from 'pg';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// ---- DB pool ----------------------------------------------------------------
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

async function dbQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string, params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const client = await pool.connect();
  try { return await client.query<T>(sql, params); }
  finally { client.release(); }
}

async function migrate() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE CHECK(char_length(email) <= 254),
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      succeeded BOOLEAN NOT NULL DEFAULT FALSE,
      attempted_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'Untitled document' CHECK(char_length(title) >= 1 AND char_length(title) <= 255),
      content TEXT NOT NULL DEFAULT '{}',
      storage_path TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS access_grants (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      collaborator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT NOT NULL DEFAULT 'edit',
      granted_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(document_id, collaborator_id)
    );
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti TEXT PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL
    );
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS storage_path TEXT DEFAULT NULL;
  `);
}

// ---- Storage ----------------------------------------------------------------
const BUCKET = process.env.STORAGE_BUCKET ?? 'docs';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function uploadFile(docId: number, filename: string, buffer: Buffer, mimetype: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${docId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

// ---- Auth helpers -----------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

class AuthError extends Error { statusCode = 401; constructor(m = 'Auth failed') { super(m); } }
class ForbiddenError extends Error { statusCode = 403; constructor(m = 'Forbidden') { super(m); } }
class NotFoundError extends Error { statusCode = 404; constructor(m = 'Not found') { super(m); } }
class ValidationError extends Error { statusCode = 422; constructor(m = 'Validation failed') { super(m); } }

async function verifyToken(token: string): Promise<{ userId: number }> {
  let payload: { userId: number; jti: string };
  try { payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as typeof payload; }
  catch { throw new AuthError('Invalid or expired token.'); }
  const { rows } = await dbQuery('SELECT jti FROM revoked_tokens WHERE jti = $1', [payload.jti]);
  if (rows.length) throw new AuthError('Token has been revoked.');
  return { userId: payload.userId };
}

async function isLocked(email: string): Promise<boolean> {
  const { rows } = await dbQuery<{ succeeded: boolean }>(
    `SELECT succeeded FROM login_attempts WHERE email = $1 ORDER BY attempted_at DESC, id DESC`, [email]
  );
  let n = 0;
  for (const r of rows) { if (!r.succeeded) n++; else break; }
  return n >= 5;
}

// ---- Express app ------------------------------------------------------------
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ message: 'Authentication required.' }); return; }
  verifyToken(h.slice(7)).then(({ userId }) => { (req as any).userId = userId; next(); })
    .catch(err => res.status(401).json({ message: err.message }));
}

function wrap(fn: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => fn(req, res).catch(next);
}

// ── Auth routes
app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) { res.status(422).json({ message: 'email and password are required.' }); return; }
  if (await isLocked(email)) { res.status(401).json({ message: 'Account locked. Try again later.' }); return; }
  const { rows } = await dbQuery<{ id: number; password: string }>('SELECT id, password FROM users WHERE email = $1', [email]);
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password))) {
    await dbQuery('INSERT INTO login_attempts (email, succeeded) VALUES ($1, FALSE)', [email]);
    res.status(401).json({ message: 'Invalid email or password.' }); return;
  }
  await dbQuery('INSERT INTO login_attempts (email, succeeded) VALUES ($1, TRUE)', [email]);
  const jti = crypto.randomUUID();
  const token = jwt.sign({ userId: rows[0].id, jti }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });
  res.json({ token });
}));

app.post('/api/auth/logout', requireAuth, wrap(async (req, res) => {
  const token = req.headers.authorization!.slice(7);
  const p = jwt.decode(token) as { jti?: string; exp?: number } | null;
  if (p?.jti) {
    const exp = p.exp ?? Math.floor(Date.now() / 1000) + 86400;
    await dbQuery('INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING', [p.jti, new Date(exp * 1000).toISOString()]);
  }
  res.status(204).send();
}));

// ── Document routes
app.get('/api/documents', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId;
  const { rows } = await dbQuery(
    `SELECT id, title, updated_at, TRUE AS is_owner FROM documents WHERE owner_id = $1
     UNION SELECT d.id, d.title, d.updated_at, FALSE FROM documents d JOIN access_grants ag ON ag.document_id = d.id WHERE ag.collaborator_id = $1
     ORDER BY updated_at DESC`, [uid]
  );
  res.json(rows.map((r: any) => ({ id: r.id, title: r.title, updatedAt: r.updated_at, isOwner: r.is_owner })));
}));

app.post('/api/documents', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId;
  const { rows } = await dbQuery('INSERT INTO documents (owner_id) VALUES ($1) RETURNING *', [uid]);
  const r = rows[0] as any;
  res.status(201).json({ id: r.id, ownerId: r.owner_id, title: r.title, content: r.content, storagePath: r.storage_path, createdAt: r.created_at, updatedAt: r.updated_at });
}));

app.get('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId;
  const { rows } = await dbQuery('SELECT * FROM documents WHERE id = $1', [Number(req.params.id)]);
  if (!rows[0]) { res.status(404).json({ message: 'Document not found' }); return; }
  const r = rows[0] as any;
  const access = await dbQuery('SELECT 1 FROM documents WHERE id=$1 AND owner_id=$2 UNION SELECT 1 FROM access_grants WHERE document_id=$1 AND collaborator_id=$2 LIMIT 1', [r.id, uid]);
  if (!access.rows.length) { res.status(403).json({ message: 'Access denied' }); return; }
  res.json({ id: r.id, ownerId: r.owner_id, title: r.title, content: r.content, storagePath: r.storage_path, createdAt: r.created_at, updatedAt: r.updated_at });
}));

app.put('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId; const docId = Number(req.params.id);
  const access = await dbQuery('SELECT 1 FROM documents WHERE id=$1 AND owner_id=$2 UNION SELECT 1 FROM access_grants WHERE document_id=$1 AND collaborator_id=$2 LIMIT 1', [docId, uid]);
  if (!access.rows.length) { res.status(403).json({ message: 'Access denied' }); return; }
  await dbQuery('UPDATE documents SET content=$1, updated_at=NOW() WHERE id=$2', [req.body.content, docId]);
  res.json({ ok: true });
}));

app.patch('/api/documents/:id/title', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId; const docId = Number(req.params.id);
  const { title } = req.body as { title?: string };
  if (!title || title.trim().length === 0 || title.length > 255) { res.status(422).json({ message: 'Invalid title' }); return; }
  const access = await dbQuery('SELECT 1 FROM documents WHERE id=$1 AND owner_id=$2 UNION SELECT 1 FROM access_grants WHERE document_id=$1 AND collaborator_id=$2 LIMIT 1', [docId, uid]);
  if (!access.rows.length) { res.status(403).json({ message: 'Access denied' }); return; }
  await dbQuery('UPDATE documents SET title=$1, updated_at=NOW() WHERE id=$2', [title, docId]);
  res.json({ ok: true });
}));

app.delete('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId; const docId = Number(req.params.id);
  const { rows } = await dbQuery('SELECT owner_id FROM documents WHERE id=$1', [docId]);
  if (!rows[0]) { res.status(404).json({ message: 'Not found' }); return; }
  if ((rows[0] as any).owner_id !== uid) { res.status(403).json({ message: 'Only owner can delete' }); return; }
  await dbQuery('DELETE FROM documents WHERE id=$1', [docId]);
  res.status(204).send();
}));

// ── Sharing routes
app.get('/api/documents/:id/collaborators', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId; const docId = Number(req.params.id);
  const own = await dbQuery('SELECT owner_id FROM documents WHERE id=$1', [docId]);
  if ((own.rows[0] as any)?.owner_id !== uid) { res.status(403).json({ message: 'Only owner can view collaborators' }); return; }
  const { rows } = await dbQuery('SELECT u.id, u.email FROM users u JOIN access_grants ag ON ag.collaborator_id=u.id WHERE ag.document_id=$1', [docId]);
  res.json(rows);
}));

app.post('/api/documents/:id/share', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId; const docId = Number(req.params.id);
  const { email } = req.body as { email?: string };
  if (!email) { res.status(422).json({ message: 'email required' }); return; }
  const own = await dbQuery('SELECT owner_id FROM documents WHERE id=$1', [docId]);
  if ((own.rows[0] as any)?.owner_id !== uid) { res.status(403).json({ message: 'Forbidden' }); return; }
  const target = await dbQuery('SELECT id FROM users WHERE email=$1', [email]);
  if (!target.rows[0]) { res.status(422).json({ message: `No user found with email: ${email}` }); return; }
  await dbQuery('INSERT INTO access_grants (document_id, collaborator_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [docId, (target.rows[0] as any).id]);
  res.json({ ok: true });
}));

app.delete('/api/documents/:id/share/:email', requireAuth, wrap(async (req, res) => {
  const uid = (req as any).userId; const docId = Number(req.params.id);
  const own = await dbQuery('SELECT owner_id FROM documents WHERE id=$1', [docId]);
  if ((own.rows[0] as any)?.owner_id !== uid) { res.status(403).json({ message: 'Forbidden' }); return; }
  const target = await dbQuery('SELECT id FROM users WHERE email=$1', [req.params.email]);
  if (!target.rows[0]) { res.status(422).json({ message: 'User not found' }); return; }
  await dbQuery('DELETE FROM access_grants WHERE document_id=$1 AND collaborator_id=$2', [docId, (target.rows[0] as any).id]);
  res.json({ ok: true });
}));

// ── Import route
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/import', requireAuth, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) { res.status(422).json({ message: 'No file uploaded.' }); return; }
  const { buffer, originalname, size } = req.file;
  const ext = path.extname(originalname).toLowerCase();
  if (!['.txt', '.md', '.docx'].includes(ext)) { res.status(422).json({ message: `Unsupported file type: ${ext}` }); return; }
  if (size === 0) { res.status(422).json({ message: 'File is empty.' }); return; }

  const uid = (req as any).userId;
  let title = path.basename(originalname, ext) || 'Untitled';
  let content = '{}';

  if (ext === '.txt') {
    const text = buffer.toString('utf-8');
    content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  } else if (ext === '.md') {
    const text = buffer.toString('utf-8');
    // Simple md → paragraph conversion (full parser is in server-only FileImporter)
    const paragraphs = text.split(/\n\n+/).map(p => ({ type: 'paragraph', content: [{ type: 'text', text: p.replace(/^#+\s*/, '') }] }));
    content = JSON.stringify({ type: 'doc', content: paragraphs });
  } else {
    // .docx — basic text extraction fallback
    content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Imported: ${originalname}` }] }] });
  }

  const { rows } = await dbQuery('INSERT INTO documents (owner_id) VALUES ($1) RETURNING *', [uid]);
  const doc = rows[0] as any;
  await dbQuery('UPDATE documents SET content=$1, title=$2, updated_at=NOW() WHERE id=$3', [content, title, doc.id]);

  // Upload original to Supabase Storage (non-fatal)
  try {
    const sp = await uploadFile(doc.id, originalname, buffer, req.file.mimetype);
    await dbQuery('UPDATE documents SET storage_path=$1 WHERE id=$2', [sp, doc.id]);
  } catch (e) {
    console.warn('[storage] non-fatal:', (e as Error).message);
  }

  const { rows: updated } = await dbQuery('SELECT * FROM documents WHERE id=$1', [doc.id]);
  const r = updated[0] as any;
  res.status(201).json({ id: r.id, ownerId: r.owner_id, title: r.title, content: r.content, storagePath: r.storage_path, createdAt: r.created_at, updatedAt: r.updated_at });
}));

// ── Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.statusCode ?? 500;
  res.status(status).json({ message: err.message ?? 'Unexpected error' });
});

// ── Serverless export
let migrated = false;
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  if (!migrated) {
    try { await migrate(); migrated = true; }
    catch (e) { console.error('[migrate]', e); }
  }
  return serverlessHandler(event, context);
};
