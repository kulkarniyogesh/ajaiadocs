import { useState, useMemo } from 'react';
import { AppShell } from '../components/AppShell';
import { GlobalNav } from '../components/GlobalNav';
import DocumentListItem from '../components/DocumentListItem';
import SkeletonLoader from '../components/SkeletonLoader';
import ImportModal from '../components/ImportModal';
import ShareDialog from '../components/ShareDialog';
import { useDocumentList } from '../hooks/useDocumentList';

interface DocumentListPageProps {
  onSelectDocument: (id: number) => void;
  userEmail?: string;
  onLogout: () => void;
}

type ViewMode = 'list' | 'grid';
type StatusFilter = 'all' | 'owned' | 'shared';
type TagFilter = 'all' | 'engineering' | 'product' | 'specs';

const TEMPLATES = [
  {
    id: 'blank',
    icon: 'note_add',
    label: 'Blank Canvas',
    desc: 'Freeform structured markdown',
    code: '00',
    title: 'Untitled Document',
    content: '',
  },
  {
    id: 'prd',
    icon: 'assignment',
    label: 'PRD Template',
    desc: 'Goals, user stories, OKR metrics',
    code: 'PRD',
    title: 'Product Requirements Document',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Product Requirements Document' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Overview' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the product vision and goals here.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. Goals & Success Metrics' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Goal 2' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. User Stories' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'As a [user], I want [feature] so that [benefit].' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '4. OKR Metrics' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Define measurable outcomes here.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '5. Out of Scope' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'List explicitly excluded features.' }] },
      ],
    }),
  },
  {
    id: 'spec',
    icon: 'terminal',
    label: 'Technical Spec',
    desc: 'Schema, API contracts, sync',
    code: 'RFC',
    title: 'Technical Specification',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Technical Specification' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. Context & Motivation' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What problem does this solve and why now?' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. API Contracts' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe endpoints, request/response shapes.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. Data Schema' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Tables, fields, types, constraints.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '4. Sync & State Management' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe sync strategy, conflict resolution, edge cases.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '5. Open Questions' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '?' }] }] },
          ]
        },
      ],
    }),
  },
  {
    id: 'meeting',
    icon: 'event_note',
    label: 'Meeting Sync',
    desc: 'Agenda, decisions, action items',
    code: 'MTG',
    title: 'Meeting Notes',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Meeting Notes' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Date: ' }, { type: 'text', marks: [{ type: 'bold' }], text: new Date().toLocaleDateString() }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Attendees' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name — Role' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
        {
          type: 'orderedList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 1' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 2' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Decisions' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Record key decisions made.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '[ ] Owner — Task — Due date' }] }] },
          ]
        },
      ],
    }),
  },
  {
    id: 'adr',
    icon: 'account_tree',
    label: 'ADR Record',
    desc: 'Context, alternatives, rationale',
    code: 'ADR',
    title: 'Architecture Decision Record',
    content: JSON.stringify({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'ADR — [Short decision title]' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Status' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Proposed / Accepted / Deprecated / Superseded' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Context' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What is the issue that motivates this decision?' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Alternatives Considered' }] },
        {
          type: 'bulletList', content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Option A — pros/cons' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Option B — pros/cons' }] }] },
          ]
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Decision' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'We will use [option] because [rationale].' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Consequences' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What becomes easier or harder as a result?' }] },
      ],
    }),
  },
];

const TAG_LABELS: Record<TagFilter, string> = {
  all: 'All Tags',
  engineering: 'Engineering',
  product: 'Product',
  specs: 'Specs',
};

const TAG_COLORS: Record<string, string> = {
  engineering: 'var(--color-primary)',
  product: 'var(--color-secondary)',
  specs: 'var(--color-tertiary)',
};

export default function DocumentListPage({
  onSelectDocument,
  userEmail,
  onLogout,
}: DocumentListPageProps) {
  const { documents, loading, error, createNew, remove, importDoc } = useDocumentList();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [recentUploads, setRecentUploads] = useState<{ name: string; size: string }[]>([]);
  const [shareDocId, setShareDocId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [ownedOnlyPill, setOwnedOnlyPill] = useState(false); // "Owned by me" pill within all-docs tab
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [filterQuery, setFilterQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all-documents');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  // Derive the status filter from both the nav tab and the inline pill
  const statusFilter: StatusFilter =
    activeTab === 'shared-with-me' ? 'shared' :
      ownedOnlyPill ? 'owned' :
        'all';

  // Clicking an inline pill updates both ownedOnlyPill and activeTab
  function handleStatusPillClick(s: StatusFilter) {
    if (s === 'shared') {
      setActiveTab('shared-with-me');
      setOwnedOnlyPill(false);
    } else if (s === 'owned') {
      setActiveTab('all-documents');
      setOwnedOnlyPill(true);
    } else {
      setActiveTab('all-documents');
      setOwnedOnlyPill(false);
    }
  }

  // When nav tab changes, also reset the owned pill
  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setOwnedOnlyPill(false);
  }

  async function handleCreateNew(options?: { title?: string; content?: string }) {
    const id = await createNew(options);
    if (id !== null) onSelectDocument(id);
  }

  async function handleDrop(file: File) {
    setUploadError(null);
    setStatusMessage(null);
    setUploading(true);
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.txt', '.md', '.docx'].includes(ext)) {
      setUploadError(`"${ext || file.name}" is not supported. Upload a .txt, .md, or .docx file.`);
      setUploading(false);
      return;
    }
    if (file.size === 0) { setUploadError('File is empty.'); setUploading(false); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError('File exceeds 5 MB.'); setUploading(false); return; }
    const id = await importDoc(file);
    setUploading(false);
    if (id !== null) {
      // Track in recent uploads list shown inside modal
      const sizeLabel = file.size < 1024
        ? `${file.size} B`
        : file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      setRecentUploads(prev => [{ name: file.name, size: sizeLabel }, ...prev].slice(0, 5));
      setImportOpen(false);
      onSelectDocument(id);
    } else {
      setUploadError('Upload failed. Please check the file and try again.');
    }
  }

  async function handleDelete(id: number) {
    await remove(id);
    setStatusMessage('Document deleted.');
    setTimeout(() => setStatusMessage(null), 3000);
  }

  // Filtered + sorted document list
  const filteredDocs = useMemo(() => {
    let result = documents.filter(doc => {
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'owned' && doc.isOwner) ||
        (statusFilter === 'shared' && !doc.isOwner);
      const matchQuery =
        !filterQuery.trim() ||
        doc.title.toLowerCase().includes(filterQuery.toLowerCase());
      return matchStatus && matchQuery;
    });

    // "Recent" tab: sort by updatedAt descending and cap at 10
    if (activeTab === 'recent') {
      result = [...result].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ).slice(0, 10);
    }

    return result;
  }, [documents, statusFilter, filterQuery, activeTab]);

  const ownedCount = documents.filter(d => d.isOwner).length;
  const sharedCount = documents.filter(d => !d.isOwner).length;

  return (
    <AppShell nav={
      <GlobalNav
        userEmail={userEmail}
        onLogout={onLogout}
        showTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewDocument={handleCreateNew}
      />
    }>
      <div style={{ background: 'var(--color-surface)', minHeight: '100%' }}>

        {/* ── Top workspace section ── */}
        <section style={{ padding: 'var(--space-lg) var(--space-xl) var(--space-md)', background: 'var(--color-surface)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

            {/* Status + error banners */}
            {statusMessage && (
              <div role="status" aria-live="polite" style={{
                padding: 'var(--space-sm) var(--space-md)', borderRadius: 8,
                background: 'var(--color-secondary-fixed)',
                borderLeft: '4px solid var(--color-secondary)',
                color: 'var(--color-on-surface)', fontSize: 'var(--text-sm)',
              }}>{statusMessage}</div>
            )}
            {error && (
              <div role="alert" style={{
                padding: 'var(--space-sm) var(--space-md)', borderRadius: 8,
                background: 'var(--color-error-container)',
                borderLeft: '4px solid var(--color-error)',
                color: 'var(--color-on-error-container)', fontSize: 'var(--text-sm)',
              }}>{error}</div>
            )}

            {/* Primary action strip */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <span>Workspace</span>
                  <span>/</span>
                  <span style={{ color: 'var(--color-primary)' }}>Docs Hub</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 9999,
                    background: 'var(--color-secondary-container)',
                    color: 'var(--color-secondary)', fontWeight: 600, fontSize: 'var(--text-xs)',
                    marginLeft: 8,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-secondary)', display: 'inline-block' }} />
                    Live Sync
                  </span>
                </div>
                <h1 style={{ margin: '4px 0 0', fontSize: 'var(--text-2xl)', fontWeight: 600, letterSpacing: 'var(--tracking-tight)', color: 'var(--color-on-surface)', lineHeight: 1.25 }}>
                  Document Central
                </h1>
              </div>

              {/* Quick action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {/* Import — opens floating modal */}
                <button
                  onClick={() => setImportOpen(true)}
                  style={{
                    height: 36, padding: '0 var(--space-md)', borderRadius: 6,
                    border: '1px solid var(--color-outline-variant)',
                    background: 'var(--color-surface-container)',
                    color: 'var(--color-on-surface)',
                    fontSize: 'var(--text-sm)', fontWeight: 500,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: 'var(--shadow-sm)', transition: 'background 100ms',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-container-high)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface-container)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-on-surface-variant)' }}>upload_file</span>
                  Import (.md, .docx, .txt)
                </button>

                {/* New doc split button */}
                <div style={{ display: 'inline-flex', borderRadius: 6, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                  <button onClick={() => handleCreateNew()} style={{
                    height: 36, padding: '0 var(--space-md)',
                    border: 'none', background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    fontSize: 'var(--text-sm)', fontWeight: 500,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                    transition: 'background 100ms', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                    New Blank Doc
                  </button>
                  <button style={{
                    height: 36, width: 36,
                    border: 'none', borderLeft: '1px solid rgba(255,255,255,0.2)',
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 100ms', fontFamily: 'inherit',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_drop_down</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Quick Template Rail ── */}
            <div style={{
              background: 'var(--color-surface-container-lowest)',
              borderRadius: 12, boxShadow: 'var(--shadow-sm)',
              padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-primary)' }}>auto_awesome</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-on-surface)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Quick Scaffold Templates
                  </span>
                </div>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>
                  Press <kbd style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--color-surface-container)', color: 'var(--color-on-surface)' }}>Alt+N</kbd> anywhere
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-sm)' }}>
                {TEMPLATES.map(t => {
                  const hov = hoveredTemplate === t.id;
                  return (
                    <div key={t.id}
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setHoveredTemplate(t.id)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                      onClick={() => handleCreateNew({ title: t.title, content: t.content || undefined })}
                      style={{
                        display: 'flex', flexDirection: 'column', padding: 'var(--space-sm)',
                        borderRadius: 8,
                        background: hov ? 'var(--color-surface-container)' : 'var(--color-surface-container-low)',
                        cursor: 'pointer', transition: 'background 100ms',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 6,
                          background: hov ? 'var(--color-primary)' : 'var(--color-surface-container-highest)',
                          color: hov ? 'var(--color-on-primary)' : 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 100ms, color 100ms',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{t.code}</span>
                      </div>
                      <span style={{
                        fontSize: 'var(--text-base)', fontWeight: 600,
                        color: hov ? 'var(--color-primary)' : 'var(--color-on-surface)',
                        transition: 'color 100ms',
                      }}>{t.label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.desc}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Filter + View Strip ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                {/* Status tabs pill */}
                <div style={{ display: 'inline-flex', padding: 4, borderRadius: 8, background: 'var(--color-surface-container)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                  {(['all', 'owned', 'shared'] as StatusFilter[]).map(s => {
                    const active =
                      s === 'all' ? (statusFilter === 'all') :
                        s === 'owned' ? (statusFilter === 'owned') :
                          (statusFilter === 'shared');
                    const count = s === 'all' ? documents.length : s === 'owned' ? ownedCount : sharedCount;
                    const labels: Record<StatusFilter, string> = { all: 'All Docs', owned: 'Owned by me', shared: 'Shared with me' };
                    return (
                      <button key={s} onClick={() => handleStatusPillClick(s)} style={{
                        padding: '4px var(--space-md)', borderRadius: 6,
                        border: 'none', cursor: 'pointer',
                        fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 500,
                        background: active ? 'var(--color-surface-container-lowest)' : 'transparent',
                        color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                        boxShadow: active ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 100ms', fontFamily: 'inherit',
                      }}>
                        {labels[s]} <span style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', marginLeft: 4 }}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tag pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8 }}>
                  {(['all', 'engineering', 'product', 'specs'] as TagFilter[]).map(tag => {
                    const active = tagFilter === tag;
                    return (
                      <button key={tag} onClick={() => setTagFilter(tag)} style={{
                        padding: '4px 10px', borderRadius: 9999,
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 'var(--text-xs)', fontWeight: active ? 600 : 500,
                        background: active ? 'var(--color-primary)' : 'var(--color-surface-container-low)',
                        color: active ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                        transition: 'all 100ms', fontFamily: 'inherit',
                      }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface-container-high)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface-container-low)'; }}
                      >
                        {tag !== 'all' && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: TAG_COLORS[tag] || 'currentColor', display: 'inline-block' }} />
                        )}
                        {TAG_LABELS[tag]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter input + view toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{ position: 'relative', width: 220 }}>
                  <span className="material-symbols-outlined" style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 18, color: 'var(--color-on-surface-variant)', pointerEvents: 'none',
                  }}>filter_list</span>
                  <input
                    type="text"
                    placeholder="Filter title or snippet..."
                    value={filterQuery}
                    onChange={e => setFilterQuery(e.target.value)}
                    style={{
                      width: '100%', height: 32,
                      paddingLeft: 32, paddingRight: 10,
                      background: 'var(--color-surface-container-lowest)',
                      border: '1px solid var(--color-outline-variant)',
                      borderRadius: 8,
                      fontSize: 'var(--text-sm)', color: 'var(--color-on-surface)',
                      outline: 'none', boxShadow: 'var(--shadow-sm)', fontFamily: 'inherit',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-outline-variant)')}
                  />
                </div>

                {/* List / Grid view toggle — prominent segmented control */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  padding: 3, borderRadius: 10,
                  background: 'var(--color-surface-container)',
                  border: '1px solid var(--color-outline-variant)',
                  flexShrink: 0,
                  gap: 2,
                }}>
                  {([
                    { mode: 'list', icon: 'format_list_bulleted', label: 'List' },
                    { mode: 'grid', icon: 'grid_view', label: 'Grid' },
                  ] as { mode: ViewMode; icon: string; label: string }[]).map(({ mode, icon, label }) => {
                    const isActive = viewMode === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        title={`${label} view`}
                        style={{
                          height: 30, padding: '0 10px',
                          border: 'none', borderRadius: 7,
                          background: isActive ? 'var(--color-primary)' : 'transparent',
                          color: isActive ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                          boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: 'var(--text-xs)', fontWeight: isActive ? 600 : 500,
                          transition: 'all 120ms', fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-surface-container-high)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Import modal (floating, docked right) ── */}
        {importOpen && (
          <ImportModal
            onClose={() => { setImportOpen(false); setUploadError(null); }}
            onFileDrop={handleDrop}
            uploading={uploading}
            recentUploads={recentUploads}
          />
        )}

        {/* Upload error toast (shown even after modal closes) */}
        {uploadError && (
          <div role="alert" style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 300,
            padding: 'var(--space-sm) var(--space-md)', borderRadius: 10,
            background: 'var(--color-error-container)', borderLeft: '4px solid var(--color-error)',
            color: 'var(--color-on-error-container)', fontSize: 'var(--text-sm)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-error)', flexShrink: 0 }}>error</span>
            <span style={{ flex: 1 }}>{uploadError}</span>
            <button onClick={() => setUploadError(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: 'var(--color-error)', padding: '0 2px', fontFamily: 'inherit',
            }}>×</button>
          </div>
        )}

        {/* ── Document canvas ── */}
        <section style={{ padding: '0 var(--space-xl) var(--space-sm)', background: 'var(--color-surface)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>

            {viewMode === 'list' ? (
              /* LIST VIEW */
              <div style={{ background: 'var(--color-surface-container-lowest)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'visible' }}>
                {/* List header with inline view toggle */}
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
                    Document Name
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_downward</span>
                  </div>
                  <div>Owner</div>
                  <div>Last sync</div>
                  <div>Collaborators</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {/* Inline mini view toggle */}
                    <div style={{ display: 'flex', padding: 2, borderRadius: 6, background: 'var(--color-surface-container)', gap: 1 }}>
                      {([
                        { mode: 'list' as ViewMode, icon: 'format_list_bulleted' },
                        { mode: 'grid' as ViewMode, icon: 'grid_view' },
                      ]).map(({ mode, icon }) => (
                        <button key={mode} onClick={() => setViewMode(mode)} title={`${mode} view`} style={{
                          width: 22, height: 22, border: 'none', borderRadius: 4,
                          background: viewMode === mode ? 'var(--color-primary)' : 'transparent',
                          color: viewMode === mode ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'inherit', transition: 'all 100ms',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: 'var(--space-md)' }}><SkeletonLoader count={4} /></div>
                ) : filteredDocs.length === 0 ? (
                  <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                    <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '0 0 8px', color: 'var(--color-on-surface)' }}>No documents found</p>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                      {documents.length === 0
                        ? 'Create a new document or upload a .txt, .md, or .docx file above.'
                        : 'Try adjusting the filters or search query.'}
                    </p>
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {filteredDocs.map((doc, i) => (
                      <li key={doc.id} style={{ borderBottom: i < filteredDocs.length - 1 ? '1px solid var(--color-outline-variant)' : 'none' }}>
                        <DocumentListItem
                          id={doc.id}
                          title={doc.title}
                          updatedAt={doc.updatedAt}
                          isOwner={doc.isOwner}
                          viewMode="list"
                          onClick={() => onSelectDocument(doc.id)}
                          onDelete={doc.isOwner ? () => handleDelete(doc.id) : undefined}
                          onShare={() => setShareDocId(doc.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              /* GRID VIEW */
              loading ? (
                <div style={{ padding: 'var(--space-md)' }}><SkeletonLoader count={4} /></div>
              ) : filteredDocs.length === 0 ? (
                <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '0 0 8px', color: 'var(--color-on-surface)' }}>No documents found</p>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Try adjusting the filters or search query.</p>
                </div>
              ) : (
                <>
                  {/* Grid header with view toggle */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 'var(--space-sm)',
                    padding: '6px 2px',
                  }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', padding: 2, borderRadius: 8, background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)', gap: 2 }}>
                      {([
                        { mode: 'list' as ViewMode, icon: 'format_list_bulleted', label: 'List' },
                        { mode: 'grid' as ViewMode, icon: 'grid_view', label: 'Grid' },
                      ]).map(({ mode, icon, label }) => (
                        <button key={mode} onClick={() => setViewMode(mode)} title={`${label} view`} style={{
                          height: 28, padding: '0 10px', border: 'none', borderRadius: 6,
                          background: viewMode === mode ? 'var(--color-primary)' : 'transparent',
                          color: viewMode === mode ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 'var(--text-xs)', fontWeight: viewMode === mode ? 600 : 500,
                          fontFamily: 'inherit', transition: 'all 100ms',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{icon}</span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
                    {filteredDocs.map(doc => (
                      <DocumentListItem
                        key={doc.id}
                        id={doc.id}
                        title={doc.title}
                        updatedAt={doc.updatedAt}
                        isOwner={doc.isOwner}
                        viewMode="grid"
                        onClick={() => onSelectDocument(doc.id)}
                        onDelete={doc.isOwner ? () => handleDelete(doc.id) : undefined}
                        onShare={() => setShareDocId(doc.id)}
                      />
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </section>

        {/* ── Storage / sync ribbon ── */}
        <section style={{ padding: 'var(--space-md) var(--space-xl) var(--space-lg)', marginTop: 'var(--space-lg)' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div style={{
              background: 'var(--color-surface-container-lowest)', borderRadius: 12,
              padding: 'var(--space-md)', boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: 'rgba(108,248,187,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-secondary)', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>verified</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-on-surface)' }}>Local &amp; Cloud Storage Continuous Sync</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 9999,
                      background: 'var(--color-secondary-container)',
                      color: 'var(--color-secondary)',
                      fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase',
                    }}>Operational</span>
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)' }}>
                    SQLite sync active • {documents.length} documents cached • Instant offline recovery enabled
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Memory Footprint</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--text-sm)', color: 'var(--color-on-surface)' }}>2.4 MB / 500 MB</span>
                </div>
                <button style={{
                  height: 32, padding: '0 var(--space-md)', borderRadius: 6,
                  border: 'none', background: 'var(--color-surface-container)',
                  color: 'var(--color-on-surface)',
                  fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  transition: 'background 100ms', fontFamily: 'inherit',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-container-high)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface-container)')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
                  Force Full Sync
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          background: 'var(--color-surface-container-low)',
          padding: 'var(--space-lg) var(--space-xl)',
          marginTop: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)',
          fontSize: 'var(--text-sm)', color: 'var(--color-on-surface-variant)',
        }}>
          <div>© 2025 Ajaia Docs Workspace. Enterprise Continuous Sync Engine.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            {['Keyboard Shortcuts', 'API & Integrations', 'Privacy Policy'].map(link => (
              <a key={link} href="#" style={{ color: 'var(--color-on-surface-variant)', textDecoration: 'none', transition: 'color 100ms' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-on-surface)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
              >{link}</a>
            ))}
          </div>
        </footer>

      </div>
      {/* Share dialog */}
      {shareDocId !== null && (
        <ShareDialog
          documentId={shareDocId}
          isOpen={true}
          onClose={() => setShareDocId(null)}
        />
      )}
    </AppShell>
  );
}
