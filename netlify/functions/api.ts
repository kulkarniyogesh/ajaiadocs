// Netlify serverless function — single self-contained file
// DB: Supabase PostgREST (HTTP) — no direct TCP/5432
// File parsing: mammoth (.docx), remark (.md), plain text (.txt)

// Polyfill WebSocket for Node < 22
import { WebSocket } from 'ws';
if (!globalThis.WebSocket) (globalThis as any).WebSocket = WebSocket;

import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import mammoth from 'mammoth';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import rehypeParse from 'rehype-parse';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Root, Node as MdNode, Heading, Paragraph, Strong, Emphasis, Text as MdText, InlineCode, Code, List, ListItem, Blockquote } from 'mdast';
import type { Element, Text as HastText, Root as HastRoot, Node as HastNode } from 'hast';

// ═══════════════════════════════════════════════════════════════════════════════
// TipTap types
// ═══════════════════════════════════════════════════════════════════════════════

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TiptapNode[];
  text?: string;
}
interface TiptapJSON { type: 'doc'; content: TiptapNode[] }
type Mark = { type: string; attrs?: Record<string, unknown> };

// ═══════════════════════════════════════════════════════════════════════════════
// Markdown → TipTap (remark-based, full fidelity)
// ═══════════════════════════════════════════════════════════════════════════════

function parseMdToTiptap(source: string): TiptapJSON {
  const tree = unified().use(remarkParse).parse(source) as Root;
  return { type: 'doc', content: (tree.children as MdNode[]).map(convertMdBlock) };
}

function convertMdBlock(node: MdNode): TiptapNode {
  switch (node.type) {
    case 'heading': { const h = node as Heading; return { type: 'heading', attrs: { level: h.depth }, content: convertMdInlines(h.children as MdNode[]) }; }
    case 'paragraph': { const p = node as Paragraph; return { type: 'paragraph', content: convertMdInlines(p.children as MdNode[]) }; }
    case 'code': { const c = node as Code; return { type: 'codeBlock', attrs: { language: c.lang ?? null }, content: [{ type: 'text', text: c.value }] }; }
    case 'list': { const l = node as List; return { type: l.ordered ? 'orderedList' : 'bulletList', content: (l.children as MdNode[]).map(convertMdBlock) }; }
    case 'listItem': { const li = node as ListItem; return { type: 'listItem', content: (li.children as MdNode[]).map(convertMdBlock) }; }
    case 'blockquote': { const bq = node as Blockquote; return { type: 'blockquote', content: (bq.children as MdNode[]).map(convertMdBlock) }; }
    case 'thematicBreak': return { type: 'horizontalRule' };
    default: return { type: 'paragraph', content: [{ type: 'text', text: extractMdText(node) }] };
  }
}

function convertMdInlines(nodes: MdNode[]): TiptapNode[] { return nodes.flatMap(n => convertMdInline(n, [])); }

function convertMdInline(node: MdNode, marks: Mark[]): TiptapNode[] {
  switch (node.type) {
    case 'text': { const r: TiptapNode = { type: 'text', text: (node as MdText).value }; if (marks.length) r.marks = marks; return [r]; }
    case 'inlineCode': return [{ type: 'text', text: (node as InlineCode).value, marks: [...marks, { type: 'code' }] }];
    case 'strong': return ((node as Strong).children as MdNode[]).flatMap(c => convertMdInline(c, [...marks, { type: 'bold' }]));
    case 'emphasis': return ((node as Emphasis).children as MdNode[]).flatMap(c => convertMdInline(c, [...marks, { type: 'italic' }]));
    default: return [{ type: 'text', text: extractMdText(node) }];
  }
}

function extractMdText(node: MdNode): string {
  if ('value' in node && typeof (node as any).value === 'string') return (node as any).value;
  if ('children' in node) return ((node as any).children ?? []).map(extractMdText).join('');
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML (mammoth output) → TipTap
// ═══════════════════════════════════════════════════════════════════════════════

function htmlToTiptap(html: string): TiptapJSON {
  const hast = unified().use(rehypeParse, { fragment: true }).parse(html) as HastRoot;
  const blocks = hast.children.flatMap(n => convertHastNode(n as HastNode, []));
  return { type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] };
}

function convertHastNode(node: HastNode, marks: Mark[]): TiptapNode[] {
  if (node.type === 'text') {
    const v = (node as HastText).value;
    if (!v.trim() && !marks.length) return [];
    if (!v) return [];
    const n: TiptapNode = { type: 'text', text: v };
    if (marks.length) n.marks = [...marks];
    return [n];
  }
  if (node.type !== 'element') return [];
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const kids = () => el.children.flatMap(c => convertHastNode(c as HastNode, marks));

  if (/^h[1-6]$/.test(tag)) return [{ type: 'heading', attrs: { level: parseInt(tag[1], 10) }, content: kids() }];
  if (tag === 'p') { const c = kids(); return [{ type: 'paragraph', content: c.length ? c : undefined }]; }
  if (tag === 'ul') return [{ type: 'bulletList', content: kids() }];
  if (tag === 'ol') return [{ type: 'orderedList', content: kids() }];
  if (tag === 'li') { const c = kids(); return [{ type: 'listItem', content: c.every(isInline) ? [{ type: 'paragraph', content: c }] : c }]; }
  if (tag === 'blockquote') return [{ type: 'blockquote', content: kids() }];
  if (tag === 'pre') return [{ type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: extractHastText(el) }] }];
  if (tag === 'hr') return [{ type: 'horizontalRule' }];
  if (tag === 'br') return [{ type: 'hardBreak' }];
  if (tag === 'strong' || tag === 'b') return el.children.flatMap(c => convertHastNode(c as HastNode, [...marks, { type: 'bold' }]));
  if (tag === 'em' || tag === 'i') return el.children.flatMap(c => convertHastNode(c as HastNode, [...marks, { type: 'italic' }]));
  if (tag === 'u') return el.children.flatMap(c => convertHastNode(c as HastNode, [...marks, { type: 'underline' }]));
  if (tag === 'code') return el.children.flatMap(c => convertHastNode(c as HastNode, [...marks, { type: 'code' }]));
  if (['table', 'img', 'figure', 'script', 'style', 'svg'].includes(tag)) return [];
  const children = kids();
  if (children.length && children.every(isInline)) return [{ type: 'paragraph', content: children }];
  return children;
}

function extractHastText(node: HastNode): string {
  if (node.type === 'text') return (node as HastText).value;
  if (node.type === 'element') return (node as Element).children.map(extractHastText).join('');
  return '';
}

function isInline(n: TiptapNode): boolean { return ['text', 'hardBreak'].includes(n.type); }

// ═══════════════════════════════════════════════════════════════════════════════
// Lazy Supabase client
// ═══════════════════════════════════════════════════════════════════════════════

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );
  }
  return _sb;
}

function jwtSecret(): string { return process.env.JWT_SECRET ?? 'dev-secret'; }
const BUCKET = process.env.STORAGE_BUCKET ?? 'ajaia-docs';

// ═══════════════════════════════════════════════════════════════════════════════
// DB helpers (PostgREST via Supabase JS)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Migration (runs once on cold start — idempotent)
// ═══════════════════════════════════════════════════════════════════════════════

async function migrate(): Promise<void> {
  // Tables are already created by local seed — this is a no-op safety net
  // Supabase doesn't expose raw SQL via REST, so we just probe the tables
  const { error } = await sb().from('users').select('id').limit(1);
  if (error) console.warn('[migrate] users table probe:', error.message);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Storage
// ═══════════════════════════════════════════════════════════════════════════════

async function uploadFile(docId: number, filename: string, buffer: Buffer, mimetype: string): Promise<string> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${docId}/${Date.now()}_${safe}`;
  const { error } = await sb().storage.from(BUCKET).upload(storagePath, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auth helpers
// ═══════════════════════════════════════════════════════════════════════════════

async function verifyToken(token: string): Promise<{ userId: number }> {
  let payload: { userId: number; jti: string };
  try { payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] }) as typeof payload; }
  catch { throw Object.assign(new Error('Invalid or expired token.'), { statusCode: 401 }); }
  const revoked = await dbSelect('revoked_tokens', { jti: payload.jti });
  if (revoked.length) throw Object.assign(new Error('Token has been revoked.'), { statusCode: 401 });
  return { userId: payload.userId };
}

async function isLocked(email: string): Promise<boolean> {
  const { data } = await sb().from('login_attempts').select('succeeded').eq('email', email).order('attempted_at', { ascending: false }).order('id', { ascending: false });
  let n = 0;
  for (const r of (data ?? [])) { if (!r.succeeded) n++; else break; }
  return n >= 5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Express app
// ═══════════════════════════════════════════════════════════════════════════════

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
  return { id: r.id, ownerId: r.owner_id, title: r.title, content: r.content, storagePath: r.storage_path ?? null, createdAt: r.created_at, updatedAt: r.updated_at };
}

async function assertAccess(docId: number, uid: number, res: express.Response): Promise<boolean> {
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (!docs[0]) { res.status(404).json({ message: 'Document not found' }); return false; }
  if (docs[0].owner_id === uid) return true;
  const grants = await dbSelect('access_grants', { document_id: docId, collaborator_id: uid });
  if (!grants.length) { res.status(403).json({ message: 'Access denied' }); return false; }
  return true;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── Documents ─────────────────────────────────────────────────────────────────

app.get('/api/documents', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!;
  const { data: owned } = await sb().from('documents').select('id,title,updated_at').eq('owner_id', uid);
  const { data: grants } = await sb().from('access_grants').select('document_id').eq('collaborator_id', uid);
  const sharedIds = (grants ?? []).map((g: any) => g.document_id);
  let shared: any[] = [];
  if (sharedIds.length) {
    const { data } = await sb().from('documents').select('id,title,updated_at').in('id', sharedIds);
    shared = data ?? [];
  }
  const ownedSet = new Set((owned ?? []).map((d: any) => d.id));
  const all = [
    ...(owned ?? []).map((d: any) => ({ id: d.id, title: d.title, updatedAt: d.updated_at, isOwner: true })),
    ...shared.filter(d => !ownedSet.has(d.id)).map((d: any) => ({ id: d.id, title: d.title, updatedAt: d.updated_at, isOwner: false })),
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
  const ok = docs[0].owner_id === uid || (await dbSelect('access_grants', { document_id: docId, collaborator_id: uid })).length > 0;
  if (!ok) { res.status(403).json({ message: 'Access denied' }); return; }
  res.json(mapDoc(docs[0]));
}));

app.put('/api/documents/:id', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  if (!(await assertAccess(docId, uid, res))) return;
  await dbUpdate('documents', { id: docId }, { content: req.body.content, updated_at: new Date().toISOString() });
  res.json({ ok: true });
}));

app.patch('/api/documents/:id/title', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const { title } = req.body as { title?: string };
  if (!title?.trim() || title.length > 255) { res.status(422).json({ message: 'Invalid title' }); return; }
  if (!(await assertAccess(docId, uid, res))) return;
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

// ── Sharing ───────────────────────────────────────────────────────────────────

app.get('/api/documents/:id/collaborators', requireAuth, wrap(async (req, res) => {
  const uid = req.userId!; const docId = Number(req.params.id);
  const docs = await dbSelect<{ owner_id: number }>('documents', { id: docId }, 'owner_id');
  if (docs[0]?.owner_id !== uid) { res.status(403).json({ message: 'Only owner can view collaborators' }); return; }
  const grants = await dbSelect<{ collaborator_id: number }>('access_grants', { document_id: docId }, 'collaborator_id');
  if (!grants.length) { res.json([]); return; }
  const { data } = await sb().from('users').select('id,email').in('id', grants.map(g => g.collaborator_id));
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

// ── Import ────────────────────────────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/import', requireAuth, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) { res.status(422).json({ message: 'No file uploaded.' }); return; }
  const { buffer, originalname, mimetype, size } = req.file;
  const ext = path.extname(originalname).toLowerCase();
  if (!['.txt', '.md', '.docx'].includes(ext)) { res.status(422).json({ message: `Unsupported file type: ${ext}` }); return; }
  if (size === 0) { res.status(422).json({ message: 'File is empty.' }); return; }

  const title = path.basename(originalname, ext).replace(/_/g, ' ').trim() || 'Untitled';
  let content: string;

  if (ext === '.txt') {
    const text = buffer.toString('utf-8');
    content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  } else if (ext === '.md') {
    content = JSON.stringify(parseMdToTiptap(buffer.toString('utf-8')));
  } else {
    // .docx — mammoth → HTML → TipTap
    const { value: html } = await mammoth.convertToHtml({ buffer });
    content = JSON.stringify(htmlToTiptap(html));
  }

  const doc = await dbInsert('documents', { owner_id: req.userId, title, content });

  // Upload original to Supabase Storage (non-fatal)
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

// ═══════════════════════════════════════════════════════════════════════════════
// Serverless export
// ═══════════════════════════════════════════════════════════════════════════════

let migrated = false;
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  if (!migrated) {
    try { await migrate(); migrated = true; }
    catch (e) { console.warn('[migrate]', (e as Error).message); migrated = true; }
  }
  return serverlessHandler(event, context);
};
