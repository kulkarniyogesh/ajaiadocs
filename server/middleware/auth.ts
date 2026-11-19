import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/AuthService.js';
import { AuthError } from '../lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      userId: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const { userId } = verifyToken(token);
    req.userId = userId;
    next();
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ message: err.message });
    } else {
      next(err);
    }
  }
}
