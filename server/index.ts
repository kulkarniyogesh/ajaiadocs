import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import sharingRouter from './routes/sharing.js';
import importRouter from './routes/import.js';
import { errorMiddleware } from './lib/errors.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/documents', sharingRouter);
app.use('/api/import', importRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDist = join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

app.use(errorMiddleware);

const port = process.env.PORT ?? 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(port), () => {
    console.log(`Server running on port ${port}`);
  });
}

export { app };
