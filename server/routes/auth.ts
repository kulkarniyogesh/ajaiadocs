import { Router } from 'express';
import { login, logout, isLocked, recordFailedAttempt } from '../services/AuthService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, AuthError } from '../lib/errors.js';

const router = Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(422).json({ message: 'email and password are required.' });
    return;
  }
  if (isLocked(email)) {
    throw new AuthError('Account is locked. Try again later.');
  }
  try {
    const { token } = await login(email, password);
    res.json({ token });
  } catch (err) {
    recordFailedAttempt(email);
    throw err;
  }
}));

// POST /api/auth/logout
router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const token = req.headers.authorization!.slice(7);
  logout(token);
  res.status(204).send();
}));

export default router;
