import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from './Button';
import Input from './Input';

interface ShareDialogProps {
  documentId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface Collaborator {
  email: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ShareDialog({ documentId, isOpen, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Fetch collaborators when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    setLoadingCollaborators(true);
    setFetchError(null);

    fetch(`/api/documents/${documentId}/collaborators`, {
      headers: authHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load collaborators (${res.status})`);
        return res.json() as Promise<Collaborator[]>;
      })
      .then((data) => setCollaborators(data))
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setLoadingCollaborators(false));
  }, [isOpen, documentId]);

  // Trap focus inside the panel
  useEffect(() => {
    if (!isOpen) return;
    firstFocusableRef.current?.focus();
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();

      // Basic focus trap: cycle focusable elements within the panel
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled'));

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Request failed (${res.status})`);
      }

      setEmail('');

      // Refresh collaborator list
      const updated = await fetch(`/api/documents/${documentId}/collaborators`, {
        headers: authHeaders(),
      });
      if (updated.ok) {
        const data = (await updated.json()) as Collaborator[];
        setCollaborators(data);
      }
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    setRemovingEmail(targetEmail);
    try {
      const res = await fetch(
        `/api/documents/${documentId}/share/${encodeURIComponent(targetEmail)}`,
        { method: 'DELETE', headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      setCollaborators((prev) => prev.filter((c) => c.email !== targetEmail));
    } catch {
      // Silently leave the item in the list; a toast system could surface this
    } finally {
      setRemovingEmail(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dialog-title"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={panelRef}
        style={{
          background: 'var(--color-surface-base)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          width: '480px',
          maxWidth: '90vw',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            id="share-dialog-title"
            style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--leading-tight)',
            }}
          >
            Share document
          </h2>
          <Button
            ref={firstFocusableRef}
            variant="icon"
            size="default"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        {/* Add collaborator form */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Collaborator email"
                disabled={submitting}
                error={submitError ?? undefined}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !email.trim()}
              style={{ flexShrink: 0, marginTop: '1px' }}
            >
              {submitting ? 'Adding…' : 'Add collaborator'}
            </Button>
          </div>
        </form>

        {/* Collaborator list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-secondary)',
            }}
          >
            People with access
          </p>

          {loadingCollaborators && (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Loading…
            </p>
          )}

          {fetchError && (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-error-700)' }}>
              {fetchError}
            </p>
          )}

          {!loadingCollaborators && !fetchError && collaborators.length === 0 && (
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              No collaborators yet.
            </p>
          )}

          {!loadingCollaborators && collaborators.map((c) => (
            <div
              key={c.email}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.email}
              </span>
              <Button
                variant="ghost"
                size="compact"
                onClick={() => handleRemove(c.email)}
                disabled={removingEmail === c.email}
                aria-label={`Remove ${c.email}`}
                style={{ flexShrink: 0, marginLeft: 'var(--space-2)' }}
              >
                {removingEmail === c.email ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
