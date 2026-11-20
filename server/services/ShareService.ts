import { query } from '../db.js';
import { ForbiddenError, ValidationError } from '../lib/errors.js';

export interface UserSummary {
  id: number;
  email: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchOwnerId(docId: number): Promise<number | null> {
  const { rows } = await query<{ owner_id: number }>(
    'SELECT owner_id FROM documents WHERE id = $1',
    [docId]
  );
  return rows[0]?.owner_id ?? null;
}

async function assertOwner(docId: number, ownerUserId: number): Promise<void> {
  const ownerId = await fetchOwnerId(docId);
  if (ownerId !== ownerUserId) {
    throw new ForbiddenError('You do not have permission to manage sharing for this document.');
  }
}

async function fetchUserByEmail(email: string): Promise<{ id: number; email: string }> {
  const { rows } = await query<{ id: number; email: string }>(
    'SELECT id, email FROM users WHERE email = $1',
    [email]
  );
  if (!rows[0]) throw new ValidationError(`No user found with email: ${email}`);
  return rows[0];
}

async function fetchOwnerEmail(userId: number): Promise<string> {
  const { rows } = await query<{ email: string }>(
    'SELECT email FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) throw new ValidationError('Owner user not found.');
  return rows[0].email;
}

// ---------------------------------------------------------------------------
// grantAccess
// ---------------------------------------------------------------------------

export async function grantAccess(
  docId: number,
  ownerUserId: number,
  collaboratorEmail: string
): Promise<void> {
  await assertOwner(docId, ownerUserId);

  const ownerEmail = await fetchOwnerEmail(ownerUserId);
  if (collaboratorEmail === ownerEmail) {
    throw new ValidationError('You cannot share a document with yourself.');
  }

  const collaborator = await fetchUserByEmail(collaboratorEmail);

  const { rows } = await query<{ count: string }>(
    'SELECT COUNT(*) FROM access_grants WHERE document_id = $1',
    [docId]
  );
  if (parseInt(rows[0].count, 10) >= 50) {
    throw new ValidationError('A document cannot have more than 50 collaborators.');
  }

  await query(
    'INSERT INTO access_grants (document_id, collaborator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [docId, collaborator.id]
  );
}

// ---------------------------------------------------------------------------
// revokeAccess
// ---------------------------------------------------------------------------

export async function revokeAccess(
  docId: number,
  ownerUserId: number,
  collaboratorEmail: string
): Promise<void> {
  await assertOwner(docId, ownerUserId);
  const collaborator = await fetchUserByEmail(collaboratorEmail);

  await query(
    'DELETE FROM access_grants WHERE document_id = $1 AND collaborator_id = $2',
    [docId, collaborator.id]
  );
}

// ---------------------------------------------------------------------------
// listCollaborators
// ---------------------------------------------------------------------------

export async function listCollaborators(
  docId: number,
  ownerUserId: number
): Promise<UserSummary[]> {
  await assertOwner(docId, ownerUserId);

  const { rows } = await query<UserSummary>(
    `SELECT u.id, u.email
     FROM users u
     JOIN access_grants ag ON ag.collaborator_id = u.id
     WHERE ag.document_id = $1`,
    [docId]
  );
  return rows;
}
