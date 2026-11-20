import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
}

/** Service-role client — bypasses RLS, safe for server-side use only. */
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const BUCKET = process.env.STORAGE_BUCKET ?? 'docs';

/**
 * Upload a file buffer to the `docs` bucket.
 * Returns the storage path, e.g. "uploads/42/report.docx"
 */
export async function uploadFile(
  docId: number,
  filename: string,
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${docId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimetype,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return path;
}

/**
 * Returns a short-lived signed URL (1 hour) for a stored file.
 */
export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) throw new Error(`Could not generate signed URL: ${error?.message}`);

  return data.signedUrl;
}
