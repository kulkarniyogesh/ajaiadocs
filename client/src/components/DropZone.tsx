import React, { useRef, useState } from 'react';

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export function DropZone({
  onFileDrop,
  accept = '.txt,.md,.docx',
  disabled = false,
}: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) onFileDrop(file);
    e.target.value = '';
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Drop zone: upload a .txt, .md, or .docx file"
      aria-disabled={disabled}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      style={{
        border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-outline-variant)'}`,
        background: dragOver ? 'var(--color-primary-fixed)' : 'var(--color-surface-container-low)',
        padding: 'var(--space-6) var(--space-8)',
        borderRadius: 'var(--radius-xl)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: [
          'border-color var(--duration-fast) var(--ease-standard)',
          'background var(--duration-fast) var(--ease-standard)',
        ].join(', '),
        marginBottom: 'var(--space-6)',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Upload icon */}
      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }} aria-hidden="true">
        ↑
      </div>

      {/* Primary instruction */}
      <p style={{
        margin: '0 0 var(--space-2)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
      }}>
        Drop a file here, or <span style={{ color: 'var(--color-text-link)' }}>click to browse</span>
      </p>

      {/* Accepted types — clearly stated */}
      <p style={{
        margin: '0 0 var(--space-3)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-secondary)',
      }}>
        Supported file types: <strong>.txt</strong>, <strong>.md</strong>, <strong>.docx</strong>
      </p>

      {/* Type chips + size limit */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {['.txt', '.md', '.docx'].map((ext) => (
          <span key={ext} style={{
            padding: '2px var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-neutral-200)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-medium)',
            fontFamily: 'var(--font-mono)',
          }}>
            {ext}
          </span>
        ))}
        <span style={{
          padding: '2px var(--space-2)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-neutral-100)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-xs)',
        }}>
          Max 5 MB
        </span>
      </div>
    </div>
  );
}

export default DropZone;
