import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { create, get, list, rename, save, deleteDoc } from '../services/DocumentService.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const docs = await list(req.userId);
  res.json(docs);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const doc = await create(req.userId);
  res.status(201).json(doc);
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = await get(Number(req.params.id), req.userId);
  res.json(doc);
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  await save(Number(req.params.id), req.body.content, req.userId);
  res.json({ ok: true });
}));

router.patch('/:id/title', requireAuth, asyncHandler(async (req, res) => {
  await rename(Number(req.params.id), req.body.title, req.userId);
  res.json({ ok: true });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await deleteDoc(Number(req.params.id), req.userId);
  res.status(204).send();
}));

export default router;
