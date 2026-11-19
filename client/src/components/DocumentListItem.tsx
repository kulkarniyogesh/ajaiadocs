import React from 'react';

interface DocumentListItemProps {
  id: number;
  title: string;
  updatedAt: string;
  isOwner: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  viewMode?: 'list' | 'grid';
}

function timeAgo(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// Icon picked deterministically by title hash
const DOC_ICONS = ['description', 'map', 'hub', 'palette', 'analytics', 'terminal', 'assignment', 'event_note', 'account_tree'];
function pickIcon(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return DOC_ICONS[h % DOC_ICONS.length];
}

// Fake collaborator initials shown as avatar stack
const FAKE_COLLABORATORS = [
  { initials: 'MT', color: '#4f46e5' },
  { initials: 'ML', color: '#006c49' },
  { initials: 'AR', color: '#684000' },
];

export function DocumentListItem({
  title,
  updatedAt,
  isOwner,
  onClick,
  onDelete,
  onShare,
  viewMode = 'list',
}: DocumentListItemProps) {
  const [hovered, setHovered] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const icon = pickIcon(title);
  const timeLabel = timeAgo(updatedAt);

  // ── Grid card view ──
  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'var(--color-surface-container-lowest)',
          borderRadius: 12,
          padding: 'var(--space-md)',
          boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transition: 'box-shadow 150ms',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          minHeight: 160,
        }}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: hovered ? 'var(--color-primary)' : 'var(--color-surface-container)',
              color: hovered ? 'var(--color-on-primary)' : 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 150ms, color 150ms',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: 9999,
              background: isOwner ? 'var(--color-surface-container)' : 'var(--color-primary-fixed)',
              color: isOwner ? 'var(--color-on-surface-variant)' : 'var(--color-primary-dark)',
              fontSize: 'var(--text-xs)', fontWeight: 600,
            }}>
              {isOwner ? 'Owned' : 'Shared'}
            </span>
          </div>
          <h3 style={{
            margin: '0 0 4px',
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            color: hovered ? 'var(--color-primary)' : 'var(--color-on-surface)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'color 150ms',
          }}>{title}</h3>
          <p style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-on-surface-variant)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.5,
          }}>
            Last edited {timeLabel}
          </p>
        </div>
        <div style={{
          paddingTop: 'var(--space-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--color-on-surface-variant)',
          fontSize: 'var(--text-xs)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--color-surface-container-high)',
              border: '2px solid var(--color-outline-variant)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-variant)',
            }}>
              {isOwner ? 'Y' : 'O'}
            </div>
            <span>{isOwner ? 'You' : 'Shared by'}</span>
          </div>
          <span style={{ fontSize: 11 }}>{timeLabel}</span>
        </div>
      </div>
    );
  }

  // ── List row view ──
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{
        display: 'grid',
        gridTemplateColumns: '5fr 2fr 2fr 2fr 1fr',
        gap: 'var(--space-sm)',
        padding: 'var(--space-md) var(--space-md)',
        alignItems: 'center',
        background: hovered ? 'rgba(239,244,255,0.6)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 100ms',
        position: 'relative',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      aria-label={`${title} — ${isOwner ? 'Owned' : 'Shared'}`}
    >
      {/* Col 1 — Title + badge + snippet */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)', minWidth: 0 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6, flexShrink: 0, marginTop: 2,
          background: hovered ? 'var(--color-primary)' : 'var(--color-surface-container)',
          color: hovered ? 'var(--color-on-primary)' : 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 150ms, color 150ms',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 'var(--text-base)', fontWeight: 600,
              color: hovered ? 'var(--color-primary)' : 'var(--color-on-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'color 150ms',
            }}>{title}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 9999,
              background: isOwner ? 'var(--color-surface-container)' : 'var(--color-primary-fixed)',
              color: isOwner ? 'var(--color-on-surface-variant)' : 'var(--color-primary-dark)',
              fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              {isOwner ? 'Owned' : 'Shared'}
            </span>
          </div>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>
            Last edited {timeLabel}
          </span>
        </div>
      </div>

      {/* Col 2 — Owner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--color-surface-container-high)',
          border: '2px solid var(--color-outline-variant)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-variant)',
          flexShrink: 0,
        }}>
          {isOwner ? 'Y' : 'O'}
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isOwner ? 'You' : 'Owner'}
        </span>
      </div>

      {/* Col 3 — Last sync */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface)' }}>{timeLabel}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-secondary)', fontWeight: 600 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
          <span>Saved</span>
        </div>
      </div>

      {/* Col 4 — Collaborator avatar stack */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {FAKE_COLLABORATORS.slice(0, 3).map((c, i) => (
          <div key={i} style={{
            width: 24, height: 24, borderRadius: '50%',
            background: c.color,
            border: '2px solid var(--color-surface-container-lowest)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff',
            marginLeft: i === 0 ? 0 : -6,
            position: 'relative',
            zIndex: 3 - i,
          }} title={c.initials}>
            {c.initials}
          </div>
        ))}
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--color-surface-container)',
          border: '2px solid var(--color-surface-container-lowest)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: 'var(--color-on-surface-variant)',
          marginLeft: -6, zIndex: 0,
        }}>+1</div>
      </div>

      {/* Col 5 — Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} onClick={e => e.stopPropagation()}>
        {/* Share */}
        <button
          onClick={e => { e.stopPropagation(); onShare?.(); }}
          title="Quick Share"
          style={{
            width: 32, height: 32, borderRadius: 6,
            border: 'none', background: 'transparent',
            color: 'var(--color-on-surface-variant)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 100ms, color 100ms',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-high)'; e.currentTarget.style.color = 'var(--color-on-surface)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
        </button>

        {/* More options (shows delete for owner) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setMoreOpen(v => !v); }}
            title="More options"
            style={{
              width: 32, height: 32, borderRadius: 6,
              border: 'none', background: moreOpen ? 'var(--color-surface-container-high)' : 'transparent',
              color: 'var(--color-on-surface-variant)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 100ms, color 100ms',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-high)'; e.currentTarget.style.color = 'var(--color-on-surface)'; }}
            onMouseLeave={e => { if (!moreOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; } }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
          </button>

          {moreOpen && (
            <>
              {/* click-away overlay */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                onClick={e => { e.stopPropagation(); setMoreOpen(false); }}
              />
              <div style={{
                position: 'absolute', right: 0, top: 36, zIndex: 50,
                width: 200,
                background: 'var(--color-surface-container-lowest)',
                borderRadius: 12,
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--color-outline-variant)',
                overflow: 'hidden',
                padding: '4px 0',
              }}>
                {[
                  { icon: 'drive_file_rename_outline', label: 'Rename Document', action: () => setMoreOpen(false) },
                  { icon: 'person_add', label: 'Manage Permissions', action: () => setMoreOpen(false) },
                  { icon: 'content_copy', label: 'Duplicate Document', action: () => setMoreOpen(false) },
                  null,
                  { icon: 'download', label: 'Export as Markdown', action: () => setMoreOpen(false) },
                  null,
                  ...(isOwner && onDelete ? [{ icon: 'delete', label: 'Move to Trash', action: () => { setMoreOpen(false); onDelete(); }, danger: true }] : []),
                ].map((item, idx) => {
                  if (item === null) return <div key={idx} style={{ height: 1, background: 'var(--color-surface-container)', margin: '4px 0' }} />;
                  if (!item) return null;
                  const { icon: ic, label, action, danger } = item as { icon: string; label: string; action: () => void; danger?: boolean };
                  return (
                    <button key={idx}
                      onClick={e => { e.stopPropagation(); action(); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px var(--space-md)',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left',
                        color: danger ? 'var(--color-error)' : 'var(--color-on-surface)',
                        fontFamily: 'inherit',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--color-error-container)' : 'var(--color-surface-container)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: danger ? 'var(--color-error)' : 'var(--color-on-surface-variant)' }}>{ic}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentListItem;
