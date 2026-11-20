import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { AuthError } from '../lib/errors.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_ALGORITHM = 'HS256' as const;
const JWT_EXPIRES_IN = '24h';

interface JwtPayload {
  userId: number;
  jti: string;
  exp?: number;
}

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

export async function login(
  email: string,
  password: string
): Promise<{ token: string }> {
  if (await isLocked(email)) {
    throw new AuthError('Account is locked. Try again later.');
  }

  const { rows } = await query<{ id: number; email: string; password: string }>(
    'SELECT id, email, password FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];

  if (!user) {
    await recordFailedAttempt(email);
    throw new AuthError('Invalid email or password.');
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    await recordFailedAttempt(email);
    throw new AuthError('Invalid email or password.');
  }

  await query(
    'INSERT INTO login_attempts (email, succeeded) VALUES ($1, TRUE)',
    [email]
  );

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

export async function logout(token: string): Promise<void> {
  let payload: JwtPayload;
  try {
    payload = jwt.decode(token) as JwtPayload;
  } catch {
    return;
  }
  if (!payload?.jti) return;

  const exp = payload.exp ?? Math.floor(Date.now() / 1000) + 86_400;
  const expiresAt = new Date(exp * 1000).toISOString();

  await query(
    'INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING',
    [payload.jti, expiresAt]
  );
}

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------

export async function verifyToken(token: string): Promise<{ userId: number }> {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
    }) as JwtPayload;
  } catch {
    throw new AuthError('Invalid or expired token.');
  }

  const { rows } = await query<{ jti: string }>(
    'SELECT jti FROM revoked_tokens WHERE jti = $1',
    [payload.jti]
  );

  if (rows.length > 0) {
    throw new AuthError('Token has been revoked.');
  }

  return { userId: payload.userId };
}

// ---------------------------------------------------------------------------
// recordFailedAttempt
// ---------------------------------------------------------------------------

export async function recordFailedAttempt(email: string): Promise<void> {
  await query(
    'INSERT INTO login_attempts (email, succeeded) VALUES ($1, FALSE)',
    [email]
  );
}

// ---------------------------------------------------------------------------
// isLocked
// ---------------------------------------------------------------------------

export async function isLocked(email: string): Promise<boolean> {
  const { rows } = await query<{ succeeded: boolean }>(
    `SELECT succeeded
     FROM   login_attempts
     WHERE  email = $1
     ORDER  BY attempted_at DESC, id DESC`,
    [email]
  );

  let consecutiveFailures = 0;
  for (const row of rows) {
    if (!row.succeeded) {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return consecutiveFailures >= 5;
}
