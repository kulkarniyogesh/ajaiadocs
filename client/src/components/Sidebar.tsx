import React from 'react';

interface SidebarProps {
  children?: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside
      style={{
        width: '280px',
        flexShrink: 0,
        background: 'var(--color-surface-raised)',
        borderRight: '1px solid var(--color-border-subtle)',
        height: '100%',
        overflowY: 'auto',
        padding: 'var(--space-4)',
      }}
    >
      {children}
    </aside>
  );
}
