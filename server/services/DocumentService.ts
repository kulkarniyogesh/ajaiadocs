import db from '../db.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Document {
  id: number;
  ownerId: number;
  title: string;
  content: string;
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
// Row shapes returned by better-sqlite3
// ---------------------------------------------------------------------------

interface DocumentRow {
  id: number;
  owner_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface SummaryRow {
  id: number;
  title: string;
  updated_at: string;
  is_owner: number;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Returns the document row or null, without any access check. */
function fetchRow(docId: number): DocumentRow | null {
  return (
    (db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .get(docId) as DocumentRow | undefined) ?? null
  );
}

/** Returns true when userId is owner or has an access grant on docId. */
function hasAccess(docId: number, userId: number): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM documents WHERE id = ? AND owner_id = ?
       UNION
       SELECT 1 FROM access_grants WHERE document_id = ? AND collaborator_id = ?
       LIMIT 1`
    )
    .get(docId, userId, docId, userId);
  return row !== undefined;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Creates a new document owned by `ownerId`.
 * Requirement 2.1
 */
export async function create(ownerId: number): Promise<Document> {
  const result = db
    .prepare('INSERT INTO documents (owner_id) VALUES (?)')
    .run(ownerId);
  const row = fetchRow(result.lastInsertRowid as number)!;
  return mapDocument(row);
}

/**
 * Returns the document if `userId` is the owner or a collaborator.
 * Requirements 2.2, 6.1
 */
export async function get(docId: number, userId: number): Promise<Document> {
  const row = fetchRow(docId);
  if (!row) {
    throw new NotFoundError('Document not found');
  }
  if (!hasAccess(docId, userId)) {
    throw new ForbiddenError();
  }
  return mapDocument(row);
}

/**
 * Lists all documents owned by or shared with `userId`, ordered by
 * most-recently updated first.
 * Requirements 2.4, 6.2
 */
export async function list(userId: number): Promise<DocumentSummary[]> {
  const rows = db
    .prepare(
      `SELECT id, title, updated_at, 1 AS is_owner
         FROM documents
        WHERE owner_id = ?
       UNION
       SELECT d.id, d.title, d.updated_at, 0
         FROM documents d
         JOIN access_grants ag ON ag.document_id = d.id
        WHERE ag.collaborator_id = ?
       ORDER BY updated_at DESC`
    )
    .all(userId, userId) as SummaryRow[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    isOwner: r.is_owner === 1,
  }));
}

/**
 * Renames a document. Title must be 1-255 non-whitespace-only characters.
 * Requirements 2.5, 5.2, 6.4
 */
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

  if (!hasAccess(docId, userId)) {
    throw new ForbiddenError();
  }

  db.prepare(
    `UPDATE documents SET title = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, docId);
}

/**
 * Saves document content. Any owner or collaborator may save.
 * Requirements 3.1, 6.1
 */
export async function save(
  docId: number,
  content: string,
  userId: number
): Promise<void> {
  if (!hasAccess(docId, userId)) {
    throw new ForbiddenError();
  }

  db.prepare(
    `UPDATE documents SET content = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(content, docId);
}

/**
 * Deletes a document. Only the owner may delete.
 * Requirements 3.2, 6.4
 */
export async function deleteDoc(docId: number, userId: number): Promise<void> {
  const row = fetchRow(docId);
  if (!row) {
    throw new NotFoundError('Document not found');
  }
  if (row.owner_id !== userId) {
    throw new ForbiddenError('Only the document owner can delete it');
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
}
