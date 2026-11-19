import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { grantAccess, revokeAccess, listCollaborators } from '../services/ShareService.js';

const router = Router();

router.get('/:id/collaborators', requireAuth, asyncHandler(async (req, res) => {
  const collaborators = await listCollaborators(Number(req.params.id), req.userId);
  res.json(collaborators);
}));

router.post('/:id/share', requireAuth, asyncHandler(async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(422).json({ message: 'email is required.' });
    return;
  }
  await grantAccess(Number(req.params.id), req.userId, email);
  res.json({ ok: true });
}));

router.delete('/:id/share/:email', requireAuth, asyncHandler(async (req, res) => {
  await revokeAccess(Number(req.params.id), req.userId, req.params.email);
  res.json({ ok: true });
}));

export default router;
