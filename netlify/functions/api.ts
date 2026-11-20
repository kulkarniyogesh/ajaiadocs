import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import authRouter from '../../server/routes/auth.js';
import documentsRouter from '../../server/routes/documents.js';
import sharingRouter from '../../server/routes/sharing.js';
import importRouter from '../../server/routes/import.js';
import { errorMiddleware } from '../../server/lib/errors.js';
import { migrate } from '../../server/db.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Routes — paths match what the client sends (/api/auth, /api/documents, etc.)
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/documents', sharingRouter);
app.use('/api/import', importRouter);

app.use(errorMiddleware);

// Migration runs once per cold start (DDL is idempotent)
let migrated = false;

const serverlessHandler = serverless(app, {
  // Strip the /.netlify/functions/api prefix so Express sees /api/...
  basePath: '/.netlify/functions/api',
});

export const handler = async (
  event: Parameters<typeof serverlessHandler>[0],
  context: Parameters<typeof serverlessHandler>[1]
) => {
  if (!migrated) {
    try {
      await migrate();
      migrated = true;
    } catch (err) {
      console.error('[db] migration error:', err);
    }
  }
  return serverlessHandler(event, context);
};
