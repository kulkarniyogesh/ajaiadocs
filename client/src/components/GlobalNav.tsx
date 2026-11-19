import React from 'react';

interface GlobalNavProps {
  userEmail?: string;
  onLogout: () => void;
  left?: React.ReactNode;
  /** Active nav tab: 'all-documents' | 'shared-with-me' | 'recent' */
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  /** Show the sub-nav tabs row (document list page only) */
  showTabs?: boolean;
  onNewDocument?: () => void;
}

const NAV_TABS = [
  { id: 'all-documents', label: 'All Documents' },
  { id: 'shared-with-me', label: 'Shared with Me' },
  { id: 'recent', label: 'Recent' },
  { id: 'architecture', label: 'Architecture & Dev Docs' },
];

export function GlobalNav({
  userEmail,
  onLogout,
  left,
  activeTab = 'all-documents',
  onTabChange,
  showTabs = false,
  onNewDocument,
}: GlobalNavProps) {
  const initials = userEmail ? userEmail[0].toUpperCase() : 'U';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(248,249,255,0.97)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
    }}>
      {/* ── Main toolbar row ── */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-xl)',
        gap: 'var(--space-md)',
      }}>
        {/* Left: logo + optional back button + team breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', minWidth: 0 }}>
          {left && (
            <div style={{ marginRight: 'var(--space-xs)', flexShrink: 0 }}>
              {left}
            </div>
          )}

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexShrink: 0 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              A
            </div>
            <span style={{
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              letterSpacing: 'var(--tracking-tight)',
              color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap',
            }}>
              Ajaia Docs
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--color-outline-variant)', flexShrink: 0 }} />

          {/* Team name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 8,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-container-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }}>domain</span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-on-surface)', letterSpacing: '0.01em' }}>
              Ajaia Product &amp; Eng Team
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-on-surface-variant)' }}>expand_more</span>
          </div>
        </div>

        {/* Centre: search bar */}
        <div style={{ flex: 1, maxWidth: 420, margin: '0 var(--space-lg)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute',
              left: 10,
              fontSize: 18,
              color: 'var(--color-on-surface-variant)',
              pointerEvents: 'none',
            }}>search</span>
            <input
              type="text"
              placeholder="Search documents… (Cmd+K)"
              style={{
                width: '100%',
                height: 36,
                paddingLeft: 36,
                paddingRight: 48,
                background: 'var(--color-surface-container-lowest)',
                border: '1px solid var(--color-outline-variant)',
                borderRadius: 8,
                fontSize: 'var(--text-sm)',
                color: 'var(--color-on-surface)',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'border-color 150ms',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-outline-variant)')}
            />
            <span style={{
              position: 'absolute',
              right: 8,
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--color-surface-container)',
              color: 'var(--color-on-surface-variant)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>⌘K</span>
          </div>
        </div>

        {/* Right: sync badge, New Doc, notifications, avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexShrink: 0 }}>

          {/* Synced badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 9999,
            background: 'var(--color-surface-container)',
            color: 'var(--color-secondary)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-secondary-container)',
              display: 'inline-block',
            }} />
            Synced
          </div>

          {/* New Document */}
          {onNewDocument && (
            <button
              onClick={onNewDocument}
              style={{
                height: 36,
                padding: '0 var(--space-md)',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: 'var(--shadow-sm)',
                transition: 'background var(--duration-fast) var(--ease-standard)',
                fontFamily: 'inherit',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              <span>New Document</span>
            </button>
          )}

          {/* Notifications */}
          <button
            style={{
              width: 36,
              height: 36,
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--color-on-surface-variant)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background var(--duration-fast)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-container-high)'; e.currentTarget.style.color = 'var(--color-on-surface)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-on-surface-variant)'; }}
            title="Notifications"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
          </button>

          {/* Avatar + name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 6px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-container-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-surface-container-high)',
              border: '2px solid var(--color-outline-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--color-on-surface-variant)',
              flexShrink: 0,
            }}>
              {initials}
            </div>
            {userEmail && (
              <span style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-on-surface-variant)',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {userEmail}
              </span>
            )}
          </div>

          {/* Sign out */}
          <button
            onClick={onLogout}
            style={{
              height: 32,
              padding: '0 var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-outline-variant)',
              background: 'transparent',
              color: 'var(--color-on-surface-variant)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background var(--duration-fast) var(--ease-standard)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-container-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Sub-nav tabs row (document list page) ── */}
      {showTabs && (
        <div style={{
          background: 'var(--color-surface-container-lowest)',
          borderTop: '1px solid var(--color-outline-variant)',
        }}>
          <div style={{
            padding: '0 var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
              {NAV_TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <a
                    key={tab.id}
                    href="#"
                    onClick={e => { e.preventDefault(); onTabChange?.(tab.id); }}
                    style={{
                      padding: '10px 0',
                      display: 'inline-block',
                      fontSize: 'var(--text-sm)',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                      borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                      textDecoration: 'none',
                      transition: 'color 150ms, border-color 150ms',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.01em',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-on-surface)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-on-surface-variant)'; }}
                  >
                    {tab.label}
                  </a>
                );
              })}
            </nav>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-on-surface-variant)',
              fontWeight: 600,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>group</span>
              <span>38 Members active</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default GlobalNav;
