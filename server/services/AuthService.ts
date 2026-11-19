import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { AuthError } from '../lib/errors.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_ALGORITHM = 'HS256' as const;
const JWT_EXPIRES_IN = '24h';

interface JwtPayload {
  userId: number;
  jti: string;
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string
): Promise<{ token: string }> {
  if (isLocked(email)) {
    throw new AuthError('Account is locked. Try again later.');
  }

  const user = db
    .prepare<[string], { id: number; email: string; password: string }>(
      'SELECT id, email, password FROM users WHERE email = ?'
    )
    .get(email);

  if (!user) {
    recordFailedAttempt(email);
    throw new AuthError('Invalid email or password.');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    recordFailedAttempt(email);
    throw new AuthError('Invalid email or password.');
  }

  // Record a succeeded attempt to reset the consecutive-failure counter.
  db.prepare(
    'INSERT INTO login_attempts (email, succeeded) VALUES (?, 1)'
  ).run(email);

  const jti = crypto.randomUUID();
  const token = jwt.sign({ userId: user.id, jti }, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
  });

  return { token };
}

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

export function logout(token: string): void {
  let payload: JwtPayload;
  try {
    payload = jwt.decode(token) as JwtPayload;
  } catch {
    return; // Nothing useful to revoke.
  }

  if (!payload?.jti) return;

  // Derive expires_at from the exp claim, falling back to 24 h from now.
  const exp: number =
    (payload as unknown as { exp?: number }).exp ??
    Math.floor(Date.now() / 1000) + 86_400;

  const expiresAt = new Date(exp * 1000).toISOString();

  db.prepare(
    'INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)'
  ).run(payload.jti, expiresAt);
}

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------

export function verifyToken(token: string): { userId: number } {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as JwtPayload;
  } catch {
    throw new AuthError('Invalid or expired token.');
  }

  const revoked = db
    .prepare<[string], { jti: string }>(
      'SELECT jti FROM revoked_tokens WHERE jti = ?'
    )
    .get(payload.jti);

  if (revoked) {
    throw new AuthError('Token has been revoked.');
  }

  return { userId: payload.userId };
}

// ---------------------------------------------------------------------------
// recordFailedAttempt
// ---------------------------------------------------------------------------

export function recordFailedAttempt(email: string): void {
  db.prepare(
    'INSERT INTO login_attempts (email, succeeded) VALUES (?, 0)'
  ).run(email);
}

// ---------------------------------------------------------------------------
// isLocked
// ---------------------------------------------------------------------------

export function isLocked(email: string): boolean {
  const attempts = db
    .prepare<[string], { succeeded: number }>(
      `SELECT succeeded
       FROM   login_attempts
       WHERE  email = ?
       ORDER  BY attempted_at DESC, id DESC`
    )
    .all(email);

  let consecutiveFailures = 0;
  for (const attempt of attempts) {
    if (attempt.succeeded === 0) {
      consecutiveFailures++;
    } else {
      break; // A success resets the streak.
    }
  }

  return consecutiveFailures >= 5;
}
