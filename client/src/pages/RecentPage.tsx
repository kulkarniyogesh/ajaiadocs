import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { GlobalNav } from '../components/GlobalNav';
import DocumentListItem from '../components/DocumentListItem';
import SkeletonLoader from '../components/SkeletonLoader';
import ShareDialog from '../components/ShareDialog';
import { useDocumentList } from '../hooks/useDocumentList';

interface RecentPageProps {
  onSelectDocument: (id: number) => void;
  userEmail?: string;
  onLogout: () => void;
  onTabChange: (tab: string) => void;
}

type ViewMode = 'list' | 'grid';

export default function RecentPage({ onSelectDocument, userEmail, onLogout, onTabChange }: RecentPageProps) {
  const { documents, loading, error, remove } = useDocumentList();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterQuery, setFilterQuery] = useState('');
  const [shareDocId, setShareDocId] = useState<number | null>(null);

  // All docs sorted newest first, filtered by query
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter(d => !filterQuery.trim() || d.title.toLowerCase().includes(filterQuery.toLowerCase()));

  async function handleDelete(id: number) {
    await remove(id);
  }

  return (
    <AppShell nav={
      <GlobalNav
        userEmail={userEmail}
        onLogout={onLogout}
        showTabs
        activeTab="recent"
        onTabChange={onTabChange}
      />
    }>
      <div style={{ background: 'var(--color-surface)', minHeight: '100%', padding: 'var(--space-lg) var(--space-xl)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                <span>Workspace</span><span>/</span>
                <span style={{ color: 'var(--color-primary)' }}>Recent</span>
              </div>
              <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--color-on-surface)', letterSpacing: '-0.02em' }}>
                Recent Documents
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>
                All your documents sorted by last edited
              </p>
            </div>

            {/* Filter + view toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--color-on-surface-variant)', pointerEvents: 'none' }}>search</span>
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={filterQuery}
                  onChange={e => setFilterQuery(e.target.value)}
                  style={{
                    height: 36, paddingLeft: 36, paddingRight: 12, width: 220,
                    background: 'var(--color-surface-container-lowest)',
                    border: '1px solid var(--color-outline-variant)', borderRadius: 8,
                    fontSize: 'var(--text-sm)', color: 'var(--color-on-surface)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-outline-variant)')}
                />
              </div>
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>
          </div>

          {error && (
            <div role="alert" style={{ padding: 'var(--space-sm) var(--space-md)', borderRadius: 8, background: 'var(--color-error-container)', borderLeft: '4px solid var(--color-error)', color: 'var(--color-on-error-container)', fontSize: 'var(--text-sm)' }}>
              {error}
            </div>
          )}

          {/* Document list */}
          {loading ? (
            <div style={{ padding: 'var(--space-md)' }}><SkeletonLoader count={8} /></div>
          ) : recentDocs.length === 0 ? (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', background: 'var(--color-surface-container-lowest)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: 12 }}>history</span>
              <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '0 0 8px', color: 'var(--color-on-surface)' }}>No documents yet</p>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>Create or import a document to get started.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
              {recentDocs.map(doc => (
                <DocumentListItem key={doc.id} id={doc.id} title={doc.title} updatedAt={doc.updatedAt} isOwner={doc.isOwner}
                  viewMode="grid" onClick={() => onSelectDocument(doc.id)}
                  onDelete={doc.isOwner ? () => handleDelete(doc.id) : undefined}
                  onShare={() => setShareDocId(doc.id)} />
              ))}
            </div>
          ) : (
            <div style={{ background: 'var(--color-surface-container-lowest)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'visible' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '5fr 2fr 2fr 2fr 1fr',
                gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--color-surface-container-low)',
                borderBottom: '1px solid var(--color-outline-variant)',
                borderRadius: '12px 12px 0 0',
                color: 'var(--color-on-surface-variant)',
                fontSize: 'var(--text-xs)', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase', userSelect: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Document Name <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_downward</span>
                </div>
                <div>Owner</div><div>Last sync</div><div>Collaborators</div>
                <div style={{ textAlign: 'right' }}>{recentDocs.length} docs</div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {recentDocs.map((doc, i) => (
                  <li key={doc.id} style={{ borderBottom: i < recentDocs.length - 1 ? '1px solid var(--color-outline-variant)' : 'none' }}>
                    <DocumentListItem id={doc.id} title={doc.title} updatedAt={doc.updatedAt} isOwner={doc.isOwner}
                      viewMode="list" onClick={() => onSelectDocument(doc.id)}
                      onDelete={doc.isOwner ? () => handleDelete(doc.id) : undefined}
                      onShare={() => setShareDocId(doc.id)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {shareDocId !== null && (
        <ShareDialog documentId={shareDocId} isOpen onClose={() => setShareDocId(null)} />
      )}
    </AppShell>
  );
}

function ViewToggle({ viewMode, setViewMode }: { viewMode: 'list' | 'grid'; setViewMode: (m: 'list' | 'grid') => void }) {
  return (
    <div style={{ display: 'flex', padding: 3, borderRadius: 10, background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)', gap: 2 }}>
      {([
        { mode: 'list' as const, icon: 'format_list_bulleted', label: 'List' },
        { mode: 'grid' as const, icon: 'grid_view', label: 'Grid' },
      ]).map(({ mode, icon, label }) => (
        <button key={mode} onClick={() => setViewMode(mode)} style={{
          height: 30, padding: '0 10px', border: 'none', borderRadius: 7,
          background: viewMode === mode ? 'var(--color-primary)' : 'transparent',
          color: viewMode === mode ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 'var(--text-xs)', fontWeight: viewMode === mode ? 600 : 500,
          fontFamily: 'inherit', transition: 'all 120ms',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}
