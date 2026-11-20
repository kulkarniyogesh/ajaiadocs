import { query } from '../db.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Document {
  id: number;
  ownerId: number;
  title: string;
  content: string;
  storagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: number;
  title: string;
  updatedAt: string;
  isOwner: boolean;
}

// ---------------------------------------------------------------------------
// Row shapes returned by pg
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: number;
  owner_id: number;
  title: string;
  content: string;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

interface SummaryRow {
  id: number;
  title: string;
  updated_at: string;
  is_owner: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    content: row.content,
    storagePath: row.storage_path ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchRow(docId: number): Promise<DocumentRow | null> {
  const { rows } = await query<DocumentRow>(
    'SELECT * FROM documents WHERE id = $1',
    [docId]
  );
  return rows[0] ?? null;
}

async function hasAccess(docId: number, userId: number): Promise<boolean> {
  const { rows } = await query<{ found: number }>(
    `SELECT 1 AS found FROM documents WHERE id = $1 AND owner_id = $2
     UNION
     SELECT 1 FROM access_grants WHERE document_id = $1 AND collaborator_id = $2
     LIMIT 1`,
    [docId, userId]
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function create(ownerId: number): Promise<Document> {
  const { rows } = await query<DocumentRow>(
    'INSERT INTO documents (owner_id) VALUES ($1) RETURNING *',
    [ownerId]
  );
  return mapDocument(rows[0]);
}

export async function get(docId: number, userId: number): Promise<Document> {
  const row = await fetchRow(docId);
  if (!row) throw new NotFoundError('Document not found');
  if (!(await hasAccess(docId, userId))) throw new ForbiddenError();
  return mapDocument(row);
}

export async function list(userId: number): Promise<DocumentSummary[]> {
  const { rows } = await query<SummaryRow>(
    `SELECT id, title, updated_at, TRUE AS is_owner
       FROM documents
      WHERE owner_id = $1
     UNION
     SELECT d.id, d.title, d.updated_at, FALSE
       FROM documents d
       JOIN access_grants ag ON ag.document_id = d.id
      WHERE ag.collaborator_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    isOwner: r.is_owner,
  }));
}

export async function rename(
  docId: number,
  title: string,
  userId: number
): Promise<void> {
  if (
    typeof title !== 'string' ||
    title.length < 1 ||
    title.length > 255 ||
    !/\S/.test(title)
  ) {
    throw new ValidationError(
      'Title must be between 1 and 255 characters and contain at least one non-whitespace character'
    );
  }
  if (!(await hasAccess(docId, userId))) throw new ForbiddenError();

  await query(
    `UPDATE documents SET title = $1, updated_at = NOW() WHERE id = $2`,
    [title, docId]
  );
}

export async function save(
  docId: number,
  content: string,
  userId: number
): Promise<void> {
  if (!(await hasAccess(docId, userId))) throw new ForbiddenError();

  await query(
    `UPDATE documents SET content = $1, updated_at = NOW() WHERE id = $2`,
    [content, docId]
  );
}

export async function deleteDoc(docId: number, userId: number): Promise<void> {
  const row = await fetchRow(docId);
  if (!row) throw new NotFoundError('Document not found');
  if (row.owner_id !== userId) {
    throw new ForbiddenError('Only the document owner can delete it');
  }
  await query('DELETE FROM documents WHERE id = $1', [docId]);
}

/** Stores the Supabase Storage path on the document record after upload. */
export async function saveStoragePath(
  docId: number,
  storagePath: string,
  userId: number
): Promise<void> {
  if (!(await hasAccess(docId, userId))) throw new ForbiddenError();
  await query(
    `UPDATE documents SET storage_path = $1, updated_at = NOW() WHERE id = $2`,
    [storagePath, docId]
  );
}
