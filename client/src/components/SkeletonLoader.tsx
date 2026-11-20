import React from 'react';

// ── Shimmer keyframe (injected once) ─────────────────────────────────────────
const SHIMMER_CSS = `
@keyframes skeleton-wave {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.sk {
  background: linear-gradient(
    90deg,
    var(--color-surface-container-low) 25%,
    var(--color-surface-container)      50%,
    var(--color-surface-container-low) 75%
  );
  background-size: 800px 100%;
  animation: skeleton-wave 1.4s ease-in-out infinite;
  border-radius: 6px;
}
@media (prefers-reduced-motion: reduce) {
  .sk { animation: none; background: var(--color-surface-container-low); }
}
`;

// ── Primitive block ───────────────────────────────────────────────────────────
function Sk({ w = '100%', h = 14, r = 6, style }: {
  w?: string | number; h?: number; r?: number; style?: React.CSSProperties;
}) {
  return (
    <div className="sk" aria-hidden style={{
      width: w, height: h, borderRadius: r, flexShrink: 0, ...style,
    }} />
  );
}

// ── List row skeleton ─────────────────────────────────────────────────────────
function ListRowSkeleton({ delay }: { delay: number }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '5fr 2fr 2fr 1fr',
      gap: 12,
      padding: '14px 16px',
      alignItems: 'center',
      borderBottom: '1px solid var(--color-outline-variant)',
      animationDelay: `${delay}ms`,
    }}>
      {/* Col 1 — icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Sk w={36} h={36} r={8} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Sk w="65%" h={14} />
          <Sk w="40%" h={11} r={4} />
        </div>
      </div>
      {/* Col 2 — owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sk w={24} h={24} r={12} />
        <Sk w="60%" h={12} />
      </div>
      {/* Col 3 — sync */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Sk w="50%" h={12} />
        <Sk w="70%" h={10} r={4} />
      </div>
      {/* Col 4 — actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        <Sk w={28} h={28} r={6} />
        <Sk w={28} h={28} r={6} />
      </div>
    </div>
  );
}

// ── Grid card skeleton ────────────────────────────────────────────────────────
function GridCardSkeleton({ delay }: { delay: number }) {
  return (
    <div style={{
      background: 'var(--color-surface-container-lowest)',
      borderRadius: 12,
      padding: 16,
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 160,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Sk w={32} h={32} r={8} />
        <Sk w={52} h={20} r={10} />
      </div>
      <Sk w="75%" h={15} />
      <Sk w="90%" h={11} r={4} />
      <Sk w="60%" h={11} r={4} />
      <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sk w={20} h={20} r={10} />
          <Sk w={60} h={11} />
        </div>
        <Sk w={36} h={11} />
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

interface SkeletonLoaderProps {
  count?: number;
  variant?: 'list' | 'grid';
}

export function SkeletonLoader({ count = 5, variant = 'list' }: SkeletonLoaderProps) {
  return (
    <>
      <style>{SHIMMER_CSS}</style>
      {variant === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {Array.from({ length: count }, (_, i) => (
            <GridCardSkeleton key={i} delay={i * 60} />
          ))}
        </div>
      ) : (
        <>
          {Array.from({ length: count }, (_, i) => (
            <ListRowSkeleton key={i} delay={i * 60} />
          ))}
        </>
      )}
    </>
  );
}

export default SkeletonLoader;
