import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { validateFile, importTxt, importMd, importDocx } from '../services/FileImporter.js';
import { create, save, rename, get } from '../services/DocumentService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(422).json({ message: 'No file uploaded.' });
    return;
  }
  const { buffer, originalname, mimetype, size } = req.file;
  validateFile(mimetype, size, originalname);

  const ext = path.extname(originalname).toLowerCase();
  let result;
  if (ext === '.txt') result = await importTxt(buffer, originalname);
  else if (ext === '.md') result = await importMd(buffer, originalname);
  else result = await importDocx(buffer, originalname);

  const userId = req.userId;
  const doc = await create(userId);
  await save(doc.id, JSON.stringify(result.content), userId);
  await rename(doc.id, result.title, userId);
  const updated = await get(doc.id, userId);
  res.status(201).json(updated);
}));

export default router;
