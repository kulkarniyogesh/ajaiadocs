import db from '../db.js';
import { ForbiddenError, ValidationError } from '../lib/errors.js';

export interface UserSummary {
  id: number;
  email: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the owner_id of a document, or null if the document doesn't exist. */
function fetchOwnerId(docId: number): number | null {
  const row = db
    .prepare<[number], { owner_id: number }>('SELECT owner_id FROM documents WHERE id = ?')
    .get(docId);
  return row?.owner_id ?? null;
}

/** Asserts that ownerUserId owns docId; throws ForbiddenError otherwise. */
function assertOwner(docId: number, ownerUserId: number): void {
  const ownerId = fetchOwnerId(docId);
  if (ownerId !== ownerUserId) {
    throw new ForbiddenError('You do not have permission to manage sharing for this document.');
  }
}

/** Looks up a user by email; throws ValidationError if not found. */
function fetchUserByEmail(email: string): { id: number; email: string } {
  const row = db
    .prepare<[string], { id: number; email: string }>('SELECT id, email FROM users WHERE email = ?')
    .get(email);
  if (!row) {
    throw new ValidationError(`No user found with email: ${email}`);
  }
  return row;
}

/** Returns the email of a user by id; throws if not found. */
function fetchOwnerEmail(userId: number): string {
  const row = db
    .prepare<[number], { email: string }>('SELECT email FROM users WHERE id = ?')
    .get(userId);
  if (!row) {
    throw new ValidationError('Owner user not found.');
  }
  return row.email;
}

// ---------------------------------------------------------------------------
// grantAccess (requirement 8.1, 8.2, 8.3)
// ---------------------------------------------------------------------------

/**
 * Grants a collaborator access to a document.
 *
 * Throws ForbiddenError  – ownerUserId does not own docId.
 * Throws ValidationError – collaboratorEmail not found, is the owner, or the
 *                          document already has 50 collaborators.
 */
export async function grantAccess(
  docId: number,
  ownerUserId: number,
  collaboratorEmail: string,
): Promise<void> {
  assertOwner(docId, ownerUserId);

  const ownerEmail = fetchOwnerEmail(ownerUserId);
  if (collaboratorEmail === ownerEmail) {
    throw new ValidationError('You cannot share a document with yourself.');
  }

  const collaborator = fetchUserByEmail(collaboratorEmail);

  const countRow = db
    .prepare<[number], { 'COUNT(*)': number }>('SELECT COUNT(*) FROM access_grants WHERE document_id = ?')
    .get(docId);
  const grantCount = countRow?.['COUNT(*)'] ?? 0;
  if (grantCount >= 50) {
    throw new ValidationError('A document cannot have more than 50 collaborators.');
  }

  db.prepare<[number, number]>(
    'INSERT OR IGNORE INTO access_grants (document_id, collaborator_id) VALUES (?, ?)',
  ).run(docId, collaborator.id);
}

// ---------------------------------------------------------------------------
// revokeAccess (requirement 8.5, 8.6)
// ---------------------------------------------------------------------------

/**
 * Revokes a collaborator's access to a document.
 *
 * Throws ForbiddenError  – ownerUserId does not own docId.
 * Throws ValidationError – collaboratorEmail not found.
 */
export async function revokeAccess(
  docId: number,
  ownerUserId: number,
  collaboratorEmail: string,
): Promise<void> {
  assertOwner(docId, ownerUserId);

  const collaborator = fetchUserByEmail(collaboratorEmail);

  db.prepare<[number, number]>(
    'DELETE FROM access_grants WHERE document_id = ? AND collaborator_id = ?',
  ).run(docId, collaborator.id);
}

// ---------------------------------------------------------------------------
// listCollaborators (requirement 8.7)
// ---------------------------------------------------------------------------

/**
 * Returns the list of users who have been granted access to a document.
 *
 * Throws ForbiddenError – ownerUserId does not own docId.
 */
export async function listCollaborators(
  docId: number,
  ownerUserId: number,
): Promise<UserSummary[]> {
  assertOwner(docId, ownerUserId);

  return db
    .prepare<[number], UserSummary>(
      `SELECT u.id, u.email
       FROM users u
       JOIN access_grants ag ON ag.collaborator_id = u.id
       WHERE ag.document_id = ?`,
    )
    .all(docId);
}
