import React, { useRef, useState } from 'react';

interface RecentUpload {
  name: string;
  size: string;
}

interface ImportModalProps {
  onClose: () => void;
  onFileDrop: (file: File) => void;
  uploading?: boolean;
  recentUploads?: RecentUpload[];
}

const SUPPORTED = ['.md', '.txt', '.docx'];

function fileIcon(name: string) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (ext === '.md') return 'markdown';
  if (ext === '.docx') return 'description';
  return 'article';
}

export function ImportModal({ onClose, onFileDrop, uploading = false, recentUploads = [] }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parseMode, setParseMode] = useState<'insert' | 'link'>('insert');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (uploading) return;
    const file = e.target.files?.[0];
    if (file) onFileDrop(file);
    e.target.value = '';
  }

  return (
    <>
      {/* Backdrop — semi-transparent, click outside closes */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(11,28,48,0.25)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal panel — docked to right side like the reference screenshot */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          right: 24,
          transform: 'translateY(-50%)',
          zIndex: 201,
          width: 320,
          background: 'var(--color-surface-container-lowest)',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(11,28,48,0.18), 0 2px 8px rgba(11,28,48,0.08)',
          border: '1px solid var(--color-outline-variant)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px var(--space-md)',
          borderBottom: '1px solid var(--color-outline-variant)',
          background: 'var(--color-surface-container-low)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--color-primary)' }}>upload_file</span>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-on-surface)' }}>
              Import or Attach File
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-on-surface-variant)', fontFamily: 'inherit',
              transition: 'background 100ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-container)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={uploading ? -1 : 0}
            aria-label="Drop zone: upload a .txt, .md, or .docx file"
            aria-disabled={uploading}
            onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => { if (!uploading) inputRef.current?.click(); }}
            onKeyDown={e => { if (!uploading && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); inputRef.current?.click(); } }}
            style={{
              border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
              background: dragOver ? 'var(--color-primary-fixed)' : 'var(--color-surface-container-low)',
              borderRadius: 12,
              padding: '20px var(--space-md)',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: uploading ? 0.6 : 1,
              transition: 'border-color 150ms, background 150ms',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.md,.docx"
              onChange={handleChange}
              disabled={uploading}
              style={{ display: 'none' }}
              aria-hidden="true"
            />
            {uploading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-primary)', display: 'block', marginBottom: 8 }}>hourglass_top</span>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-on-surface)' }}>Importing…</p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: dragOver ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', display: 'block', marginBottom: 8 }}>drive_folder_upload</span>
                <p style={{ margin: '0 0 4px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                  Drag &amp; drop file here
                </p>
                <p style={{ margin: '0 0 10px', fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)' }}>
                  or{' '}
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600, cursor: 'pointer' }}>Browse computer</span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {SUPPORTED.map(ext => (
                    <span key={ext} style={{
                      padding: '2px 7px', borderRadius: 4,
                      background: 'var(--color-surface-container)',
                      color: 'var(--color-on-surface-variant)',
                      fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
                    }}>{ext}</span>
                  ))}
                  <span style={{
                    padding: '2px 7px', borderRadius: 4,
                    background: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface-variant)',
                    fontSize: 11,
                  }}>MAX 5MB</span>
                </div>
              </>
            )}
          </div>

          {/* Parsing behaviour */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Parsing Behaviour
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                {
                  id: 'insert' as const,
                  label: 'Insert content at cursor',
                  desc: 'Transforms Markdown or text into native rich-text blocks',
                },
                {
                  id: 'link' as const,
                  label: 'Save as linked attachment',
                  desc: 'Embeds downloadable asset link into document',
                },
              ].map(opt => (
                <label key={opt.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: parseMode === opt.id ? 'var(--color-primary-fixed)' : 'transparent',
                  border: `1px solid ${parseMode === opt.id ? 'var(--color-primary)' : 'transparent'}`,
                  transition: 'background 100ms, border-color 100ms',
                }}>
                  <input
                    type="radio"
                    name="parseMode"
                    value={opt.id}
                    checked={parseMode === opt.id}
                    onChange={() => setParseMode(opt.id)}
                    style={{ marginTop: 2, accentColor: 'var(--color-primary)', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-on-surface)' }}>{opt.label}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)', marginTop: 1 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Recent uploads */}
          {recentUploads.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Recent Uploads
                </p>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)' }}>
                  {recentUploads.length} files
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recentUploads.map((u, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 8,
                    background: 'var(--color-surface-container-low)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)', flexShrink: 0 }}>{fileIcon(u.name)}</span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)', flexShrink: 0, fontFamily: 'JetBrains Mono, monospace' }}>{u.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => { if (!uploading) inputRef.current?.click(); }}
            disabled={uploading}
            style={{
              width: '100%', height: 38, border: 'none', borderRadius: 8,
              background: uploading ? 'var(--color-surface-container)' : 'var(--color-primary)',
              color: uploading ? 'var(--color-on-surface-variant)' : 'var(--color-on-primary)',
              fontSize: 'var(--text-sm)', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 100ms', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
            onMouseLeave={e => { if (!uploading) e.currentTarget.style.background = 'var(--color-primary)'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {uploading ? 'hourglass_top' : 'check_circle'}
            </span>
            {uploading ? 'Processing…' : 'Process & Embed Selected'}
          </button>
        </div>
      </div>
    </>
  );
}

export default ImportModal;
