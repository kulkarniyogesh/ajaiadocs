import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/errors.js';
import { validateFile, importTxt, importMd, importDocx } from '../services/FileImporter.js';
import { create, save, rename, get, saveStoragePath } from '../services/DocumentService.js';
import { uploadFile } from '../lib/storage.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(422).json({ message: 'No file uploaded.' });
    return;
  }

  const { buffer, originalname, mimetype, size } = req.file;
  validateFile(mimetype, size, originalname);

  // 1. Parse file content into TipTap JSON
  const ext = path.extname(originalname).toLowerCase();
  let result;
  if (ext === '.txt') result = await importTxt(buffer, originalname);
  else if (ext === '.md') result = await importMd(buffer, originalname);
  else result = await importDocx(buffer, originalname);

  const userId = req.userId;

  // 2. Create the document record
  const doc = await create(userId);

  // 3. Save parsed content and title
  await save(doc.id, JSON.stringify(result.content), userId);
  await rename(doc.id, result.title, userId);

  // 4. Upload original file to Supabase Storage 'docs' bucket
  try {
    const storagePath = await uploadFile(doc.id, originalname, buffer, mimetype);
    await saveStoragePath(doc.id, storagePath, userId);
    console.log(`[storage] uploaded to ${storagePath}`);
  } catch (err) {
    // Storage upload failure is non-fatal — document is still usable
    console.warn('[storage] upload failed (non-fatal):', (err as Error).message);
  }

  // 5. Return the full document
  const updated = await get(doc.id, userId);
  res.status(201).json(updated);
}));

export default router;
