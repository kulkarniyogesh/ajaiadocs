import { useState, useEffect, useCallback } from 'react';
import { listDocuments, createDocument, deleteDocument, importFile, type DocumentSummary } from '../api/client';

export function useDocumentList() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Also refresh on window focus
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  async function createNew(options?: { title?: string; content?: string }): Promise<number | null> {
    try {
      const doc = await createDocument(options);
      await refresh();
      return doc.id;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }

  async function remove(id: number): Promise<void> {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function importDoc(file: File): Promise<number | null> {
    try {
      const doc = await importFile(file);
      await refresh();
      return doc.id;
    } catch (err) {
      // Expose error message to the hook consumer via the error state,
      // but also re-throw so the caller can handle it directly if needed.
      const msg = (err as Error).message ?? 'Upload failed';
      setError(msg);
      return null;
    }
  }

  return { documents, loading, error, refresh, createNew, remove, importDoc };
}
