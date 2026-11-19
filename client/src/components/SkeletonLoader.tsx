import React from 'react';

interface SkeletonLoaderProps {
  count?: number;
}

const shimmerKeyframes = `
@keyframes shimmer {
  from { opacity: 0.5; }
  to   { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-row {
    animation: none !important;
  }
}
`;

const rowStyle: React.CSSProperties = {
  height: '56px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-neutral-100)',
  marginBottom: 'var(--space-2)',
  animation: 'shimmer 1.2s infinite alternate',
};

export function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="skeleton-row"
          style={rowStyle}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export default SkeletonLoader;
