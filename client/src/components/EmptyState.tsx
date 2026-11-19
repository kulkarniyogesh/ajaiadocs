import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const containerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: 'var(--space-16) var(--space-8)',
  color: 'var(--color-text-secondary)',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xl)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-text-secondary)',
  margin: '0 0 var(--space-2) 0',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: 'var(--text-base)',
  margin: '0 0 var(--space-6) 0',
};

const actionStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div style={containerStyle}>
      <p style={titleStyle}>{title}</p>

      {description && (
        <p style={descriptionStyle}>{description}</p>
      )}

      {action && (
        <div style={actionStyle}>{action}</div>
      )}
    </div>
  );
}

export default EmptyState;
