import React from 'react';

interface AppShellProps {
  nav: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ nav, sidebar, children }: AppShellProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {nav}
      <div style={{ display: 'flex', flex: 1 }}>
        {sidebar}
        <main style={{ flex: 1, background: 'var(--color-surface)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
