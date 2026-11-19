import React from 'react';

type SaveStatus = 'saved' | 'saving' | 'error' | 'stopped';

interface AutosaveIndicatorProps {
  status: SaveStatus;
}

const styles = `
@keyframes pulse-opacity {
  from { opacity: 1; }
  to { opacity: 0.3; }
}

@media (prefers-reduced-motion: reduce) {
  .autosave-dot--pulsing {
    animation: none !important;
  }
}
`;

const statusConfig: Record<SaveStatus, { color: string; label: string; pulse: boolean }> = {
  saved:   { color: 'var(--color-success-500)', label: 'Saved',                 pulse: false },
  saving:  { color: 'var(--color-warning-500)', label: 'Saving\u2026',          pulse: true  },
  error:   { color: 'var(--color-error-500)',   label: 'Save failed \u2014 retrying', pulse: false },
  stopped: { color: 'var(--color-error-500)',   label: 'Saving stopped',        pulse: false },
};

export function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
  const { color, label, pulse } = statusConfig[status];

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    ...(pulse
      ? { animation: 'pulse-opacity var(--duration-slow) infinite alternate' }
      : {}),
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-secondary)',
  };

  return (
    <>
      <style>{styles}</style>
      <span style={wrapperStyle}>
        <span
          style={dotStyle}
          className={pulse ? 'autosave-dot--pulsing' : undefined}
          aria-hidden="true"
        />
        {label}
      </span>
    </>
  );
}

export default AutosaveIndicator;
