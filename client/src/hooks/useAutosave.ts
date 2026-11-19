import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDocument } from '../api/client';

export type SaveStatus = 'saved' | 'saving' | 'error' | 'stopped';

export function useAutosave(documentId: number | null) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const DEBOUNCE_MS = 2000;
  const RETRY_MS = 5000;

  const save = useCallback(async (content: string) => {
    if (!documentId) return;
    setStatus('saving');
    try {
      await saveDocument(documentId, content);
      setStatus('saved');
      retryCountRef.current = 0;
    } catch {
      retryCountRef.current += 1;
      if (retryCountRef.current >= MAX_RETRIES) {
        setStatus('stopped');
      } else {
        setStatus('error');
        // Schedule retry
        setTimeout(() => save(content), RETRY_MS);
      }
    }
  }, [documentId]);

  const onUpdate = useCallback((content: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(content), DEBOUNCE_MS);
  }, [save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { status, onUpdate };
}
