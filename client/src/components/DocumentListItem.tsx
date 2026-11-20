import React from 'react';
import ReactDOM from 'react-dom';

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

const DOC_ICONS = ['description', 'map', 'hub', 'palette', 'analytics', 'terminal', 'assignment', 'event_note', 'account_tree'];
function pickIcon(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return DOC_ICONS[h % DOC_ICONS.length];
}

const FAKE_COLLABORATORS = [
  { initials: 'MT', color: '#4f46e5' },
  { initials: 'ML', color: '#006c49' },
  { initials: 'AR', color: '#684000' },
];

// ── Portal-based context menu ─────────────────────────────────────────────────

interface MenuPos { top: number; right: number }

interface ContextMenuProps {
  pos: MenuPos;
  isOwner: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

function ContextMenu({ pos, isOwner, onClose, onDelete }: ContextMenuProps) {
  const items = [
    { icon: 'drive_file_rename_outline', label: 'Rename Document', action: onClose },
    { icon: 'person_add', label: 'Manage Permissions', action: onClose },
    { icon: 'content_copy', label: 'Duplicate Document', action: onClose },
    null,
    { icon: 'download', label: 'Export as Markdown', action: onClose },
    null,
    ...(isOwner && onDelete
      ? [{ icon: 'delete', label: 'Move to Trash', action: () => { onClose(); onDelete(); }, danger: true }]
      : []),
  ];

  return ReactDOM.createPortal(
    <>
      {/* Full-screen click-away */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
        onMouseDown={e => { e.stopPropagation(); onClose(); }}
      />
      {/* Menu panel */}
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos.top,
          right: pos.right,
          zIndex: 999,
          width: 210,
          background: 'var(--color-surface-container-lowest)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(11,28,48,0.18), 0 2px 8px rgba(11,28,48,0.08)',
          border: '1px solid var(--color-outline-variant)',
          padding: '4px 0',
          overflow: 'hidden',
        }}
      >
        {items.map((item, idx) => {
          if (item === null) {
            return <div key={idx} style={{ height: 1, background: 'var(--color-surface-container)', margin: '4px 0' }} />;
          }
          const { icon: ic, label, action, danger } = item as { icon: string; label: string; action: () => void; danger?: boolean };
          return (
            <button
              key={idx}
              onMouseDown={e => { e.stopPropagation(); action(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px',
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left',
                color: danger ? 'var(--color-error)' : 'var(--color-on-surface)',
                fontFamily: 'inherit', transition: 'background 80ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--color-error-container)' : 'var(--color-surface-container)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: danger ? 'var(--color-error)' : 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                {ic}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
  const [menuPos, setMenuPos] = React.useState<MenuPos | null>(null);
  const moreRef = React.useRef<HTMLButtonElement>(null);
  const icon = pickIcon(title);
  const timeLabel = timeAgo(updatedAt);

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!moreRef.current) return;
    const rect = moreRef.current.getBoundingClientRect();
    // Anchor to bottom-right of the button, flip up if too close to bottom
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 260; // approx
    const top = spaceBelow > menuHeight
      ? rect.bottom + 6
      : rect.top - menuHeight - 6;
    setMenuPos({
      top,
      right: window.innerWidth - rect.right,
    });
  }

  // ── Grid card ──
  if (viewMode === 'grid') {
    return (
      <>
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
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            cursor: 'pointer', minHeight: 160,
          }}
          role="button" tabIndex={0}
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
              margin: '0 0 4px', fontSize: 'var(--text-base)', fontWeight: 600,
              color: hovered ? 'var(--color-primary)' : 'var(--color-on-surface)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'color 150ms',
            }}>{title}</h3>
            <p style={{
              margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5,
            }}>Last edited {timeLabel}</p>
          </div>
          <div style={{ paddingTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-on-surface-variant)', fontSize: 'var(--text-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-surface-container-high)', border: '2px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
                {isOwner ? 'Y' : 'O'}
              </div>
              <span>{isOwner ? 'You' : 'Shared by'}</span>
            </div>
            <span style={{ fontSize: 11 }}>{timeLabel}</span>
          </div>
        </div>

        {menuPos && (
          <ContextMenu
            pos={menuPos}
            isOwner={isOwner}
            onClose={() => setMenuPos(null)}
            onDelete={onDelete}
          />
        )}
      </>
    );
  }

  // ── List row ──
  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'grid',
          gridTemplateColumns: '5fr 2fr 2fr 2fr 1fr',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md) var(--space-md)',
          alignItems: 'center',
          background: hovered ? 'rgba(239,244,255,0.6)' : 'transparent',
          cursor: 'pointer',
          transition: 'background 100ms',
        }}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        aria-label={`${title} — ${isOwner ? 'Owned' : 'Shared'}`}
      >
        {/* Col 1 — Title */}
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
              }}>{isOwner ? 'Owned' : 'Shared'}</span>
            </div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>
              Last edited {timeLabel}
            </span>
          </div>
        </div>

        {/* Col 2 — Owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-surface-container-high)', border: '2px solid var(--color-outline-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
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

        {/* Col 4 — Collaborator avatars */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {FAKE_COLLABORATORS.slice(0, 3).map((c, i) => (
            <div key={i} style={{
              width: 24, height: 24, borderRadius: '50%', background: c.color,
              border: '2px solid var(--color-surface-container-lowest)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff',
              marginLeft: i === 0 ? 0 : -6, position: 'relative', zIndex: 3 - i,
            }} title={c.initials}>{c.initials}</div>
          ))}
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: 'var(--color-surface-container)',
            border: '2px solid var(--color-surface-container-lowest)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: 'var(--color-on-surface-variant)',
            marginLeft: -6,
          }}>+1</div>
        </div>

        {/* Col 5 — Actions */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Share */}
          <button
            onClick={e => { e.stopPropagation(); onShare?.(); }}
            title="Quick Share"
            style={{
              width: 32, height: 32, borderRadius: 6,
              border: 'none', background: 'transparent',
              color: 'var(--color-on-surface-variant)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-high)'; e.currentTarget.style.color = 'var(--color-on-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
          </button>

          {/* More options */}
          <button
            ref={moreRef}
            onClick={openMenu}
            title="More options"
            style={{
              width: 32, height: 32, borderRadius: 6,
              border: 'none', background: menuPos ? 'var(--color-surface-container-high)' : 'transparent',
              color: 'var(--color-on-surface-variant)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-high)'; e.currentTarget.style.color = 'var(--color-on-surface)'; }}
            onMouseLeave={e => { if (!menuPos) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; } }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
          </button>
        </div>
      </div>

      {menuPos && (
        <ContextMenu
          pos={menuPos}
          isOwner={isOwner}
          onClose={() => setMenuPos(null)}
          onDelete={onDelete}
        />
      )}
    </>
  );
}

export default DocumentListItem;
