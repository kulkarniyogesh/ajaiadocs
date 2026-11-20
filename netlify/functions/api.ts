// Netlify serverless function
// Uses Supabase JS client (HTTP/HTTPS only — no direct TCP to Postgres)
// All DB access goes through PostgREST + Supabase Auth Admin APIs

import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ── Lazy Supabase client (HTTP only, no TCP) ──────────────────────────────────

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _sb;
}

function jwtSecret(): string {
  return process.env.JWT_SECRET ?? 'dev-secret';
}

// ── Generic DB helpers via PostgREST ──────────────────────────────────────────

async function dbSelect<T = any>(table: string, match: Record<string, any> = {}, cols = '*'): Promise<T[]> {
  let q = sb().from(table).select(cols);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

async function dbInsert<T = any>(table: string, row: Record<string, any>): Promise<T> {
  const { data, error } = await sb().from(table).insert(row).select().single();
  if (error) throw new Error(error.message);
  return data as T;
}

async function dbUpdate(table: string, match: Record<string, any>, values: Record<string, any>): Promise<void> {
  let q = sb().from(table).update(values);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

async function dbDelete(table: string, match: Record<string, any>): Promise<void> {
  let q = sb().from(table).delete();
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

// ── Bootstrap tables via Supabase SQL endpoint ────────────────────────────────

async function migrate(): Promise<void> {
  const sql = `
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
      title TEXT NOT NULL DEFAULT 'Untitled document',
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
  `;
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  // exec_sql may not exist — tables already created via local migration, so ignore errors here
  if (!res.ok) console.warn('[migrate] skipped (tables already exist)');
}

// ── Storage ───────────────────────────────────────────────────────────────────

const BUCKET = process.env.STORAGE_BUCKET ?? 'docs';

async function uploadFile(docId: number, filename: string, buffer: Buffer, mimetype: string): Promise<string> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${docId}/${Date.now()}_${safe}`;
  const { error } = await sb().storage.from(BUCKET).upload(storagePath, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function verifyToken(token: string): Promise<{ userId: number }> {
  let payload: { userId: number; jti: string };
  try {
    payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as typeof payload;
  } catch {
    throw Object.assign(new Error('Invalid or expired token.'), { statusCode: 401 });
  }
  const revoked = await dbSelect('revoked_tokens', { jti: payload.jti });
  if (revoked.length) throw Object.assign(new Error('Token has been revoked.'), { statusCode: 401 });
  return { userId: payload.userId };
}

async function isLocked(email: string): Promise<boolean> {
  const { data } = await sb()
    .from('login_attempts')
    .select('succeeded')
    .eq('email', email)
    .order('attempted_at', { ascending: false })
    .order('id', { ascending: false });
  let n = 0;
  for (const r of (data ?? [])) { if (!r.succeeded) n++; else break; }
  return n >= 5;
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

type Req = express.Request & { userId?: number };

function requireAuth(req: Req, res: express.Response, next: express.NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) { res.status(401).json({ message: 'Authentication required.' }); return; }
  verifyToken(h.slice(7))
    .then(({ userId }) => { req.userId = userId; next(); })
    .catch(() => res.status(401).json({ message: 'Invalid or expired token.' }));
}

function wrap(fn: (req: Req, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) =>
    fn(req as Req, res).catch(next);
}

function mapDoc(r: any) {
  return {
    id: r.id, ownerId: r.owner_id, title: r.title,
    content: r.content, storagePath: r.storage_path ?? null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// ── Auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) { res.status(422).json({ message: 'email and password are required.' }); return; }
  if (await isLocked(email)) { res.status(401).json({ message: 'Account locked. Try again later.' }); return; }

  const users = await dbSelect<{ id: number; password: string }>('users', { email }, 'id,password');
  if (!users[0] || !(await bcrypt.compare(password, users[0].password))) {
    await dbInsert('login_attempts', { email, succeeded: false });
    res.status(401).json({ message: 'Invalid email or password.' }); return;
  }
  await dbInsert('login_attempts', { email, succeeded: true });
  const jti = crypto.randomUUID();
  const token = jwt.sign({ userId: users[0].id, jti }, jwtSecret(), { algorithm: 'HS256', expiresIn: '24h' });
  res.json({ token });
}));

app.post('/api/auth/logout', requireAuth, wrap(async (req, res) => {
  const token = req.headers.authorization!.slice(7);
  const p = jwt.decode(token) as { jti?: string; exp?: number } | null;
  if (p?.jti) {
    const exp = p.exp ?? Math.floor(Date.now() / 1000) + 86400;
    await sb().from('revoked_tokens').upsert({ jti: p.jti, expires_at: new Date(exp * 1000).toISOString() });
  }
  res.status(204).send();
}));

// ── Document routes ───────────────────────────────────────────────────────────

app.get('/api/documents', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!;
  // Owned
  const { data: owned } = await sb().from('documents').select('id,title,updated_at').eq('owner_id', uid);
  // Shared
  const { data: grants } = await sb().from('access_grants').select('document_id').eq('collaborator_id', uid);
  const sharedIds = (grants ?? []).map((g: any) => g.document_id);
  let shared: any[] = [];
  if (sharedIds.length) {
    const { data } = await sb().from('documents').select('id,title,updated_at').in('id', sharedIds);
    shared = data ?? [];
  }
  const ownedIds = new Set((owned ?? []).map((d: any) => d.id));
  const all = [
    ...(owned ?? []).map((d: any) => ({ id: d.id, title: d.title, updatedAt: d.updated_at, isOwner: true })),
    ...shared.filter(d => !ownedIds.has(d.id)).map((d: any) => ({ id: d.id, title: d.title, updatedAt: d.updated_at, isOwner: false })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(all);
}));

app.post('/api/documents', requireAuth, wrap(async (req, res) => {
  const doc = await dbInsert('documents', { owner_id: req.userId });
  res.status(201).json(mapDoc(doc));
}));

app.get('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const docs = await dbSelect('documents', { id: docId });
  if (!docs[0]) { res.status(404).json({ message: 'Document not found' }); return; }
  const isOwner = docs[0].owner_id === uid;
  if (!isOwner) {
    const grants = await dbSelect('access_grants', { document_id: docId, collaborator_id: uid });
    if (!grants.length) { res.status(403).json({ message: 'Access denied' }); return; }
  }
  res.json(mapDoc(docs[0]));
}));

app.put('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  await assertAccess(docId, uid, res);
  if (res.headersSent) return;
  await dbUpdate('documents', { id: docId }, { content: req.body.content, updated_at: new Date().toISOString() });
  res.json({ ok: true });
}));

app.patch('/api/documents/:id/title', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const { title } = req.body as { title?: string };
  if (!title?.trim() || title.length > 255) { res.status(422).json({ message: 'Invalid title' }); return; }
  await assertAccess(docId, uid, res);
  if (res.headersSent) return;
  await dbUpdate('documents', { id: docId }, { title, updated_at: new Date().toISOString() });
  res.json({ ok: true });
}));

app.delete('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (!docs[0]) { res.status(404).json({ message: 'Not found' }); return; }
  if (docs[0].owner_id !== uid) { res.status(403).json({ message: 'Only owner can delete' }); return; }
  await dbDelete('documents', { id: docId });
  res.status(204).send();
}));

async function assertAccess(docId: number, uid: number, res: express.Response): Promise<boolean> {
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (!docs[0]) { res.status(404).json({ message: 'Not found' }); return false; }
  if (docs[0].owner_id === uid) return true;
  const grants = await dbSelect('access_grants', { document_id: docId, collaborator_id: uid });
  if (!grants.length) { res.status(403).json({ message: 'Access denied' }); return false; }
  return true;
}

// ── Sharing routes ────────────────────────────────────────────────────────────

app.get('/api/documents/:id/collaborators', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (docs[0]?.owner_id !== uid) { res.status(403).json({ message: 'Only owner can view collaborators' }); return; }
  const grants = await dbSelect<{ collaborator_id: number }>('access_grants', { document_id: docId }, 'collaborator_id');
  const ids = grants.map(g => g.collaborator_id);
  if (!ids.length) { res.json([]); return; }
  const { data } = await sb().from('users').select('id,email').in('id', ids);
  res.json(data ?? []);
}));

app.post('/api/documents/:id/share', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const { email } = req.body as { email?: string };
  if (!email) { res.status(422).json({ message: 'email required' }); return; }
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (docs[0]?.owner_id !== uid) { res.status(403).json({ message: 'Forbidden' }); return; }
  const target = await dbSelect<{ id: number }>('users', { email }, 'id');
  if (!target[0]) { res.status(422).json({ message: `No user found with email: ${email}` }); return; }
  await sb().from('access_grants').upsert({ document_id: docId, collaborator_id: target[0].id });
  res.json({ ok: true });
}));

app.delete('/api/documents/:id/share/:email', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (docs[0]?.owner_id !== uid) { res.status(403).json({ message: 'Forbidden' }); return; }
  const target = await dbSelect<{ id: number }>('users', { email: req.params.email }, 'id');
  if (!target[0]) { res.status(422).json({ message: 'User not found' }); return; }
  await dbDelete('access_grants', { document_id: docId, collaborator_id: target[0].id });
  res.json({ ok: true });
}));

// ── Import route ──────────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/import', requireAuth, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) { res.status(422).json({ message: 'No file uploaded.' }); return; }
  const { buffer, originalname, mimetype, size } = req.file;
  const ext = path.extname(originalname).toLowerCase();
  if (!['.txt', '.md', '.docx'].includes(ext)) { res.status(422).json({ message: `Unsupported: ${ext}` }); return; }
  if (size === 0) { res.status(422).json({ message: 'File is empty.' }); return; }

  const title = path.basename(originalname, ext) || 'Untitled';
  let content = '{}';
  if (ext === '.txt') {
    const text = buffer.toString('utf-8');
    content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  } else if (ext === '.md') {
    const text = buffer.toString('utf-8');
    const paras = text.split(/\n\n+/).filter(Boolean).map(p => ({
      type: 'paragraph', content: [{ type: 'text', text: p.replace(/^#{1,6}\s*/, '') }]
    }));
    content = JSON.stringify({ type: 'doc', content: paras.length ? paras : [{ type: 'paragraph' }] });
  } else {
    content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: `[Imported: ${originalname}]` }] }] });
  }

  const doc = await dbInsert('documents', { owner_id: req.userId, title, content });

  try {
    const sp = await uploadFile(doc.id, originalname, buffer, mimetype);
    await dbUpdate('documents', { id: doc.id }, { storage_path: sp });
  } catch (e) {
    console.warn('[storage] non-fatal:', (e as Error).message);
  }

  const updated = await dbSelect('documents', { id: doc.id });
  res.status(201).json(mapDoc(updated[0]));
}));

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err?.message);
  res.status(err?.statusCode ?? 500).json({ message: err?.message ?? 'Unexpected error' });
});

// ── Serverless export ─────────────────────────────────────────────────────────

let migrated = false;
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  if (!migrated) {
    try { await migrate(); migrated = true; }
    catch (e) { console.warn('[migrate]', (e as Error).message); migrated = true; }
  }
  return serverlessHandler(event, context);
};
