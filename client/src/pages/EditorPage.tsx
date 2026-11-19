import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import { getDocument, renameDocument } from '../api/client';
import { Toolbar } from '../components/Toolbar';
import AutosaveIndicator from '../components/AutosaveIndicator';
import { AppShell } from '../components/AppShell';
import { GlobalNav } from '../components/GlobalNav';
import Button from '../components/Button';
import ShareDialog from '../components/ShareDialog';
import Input from '../components/Input';
import { useAutosave } from '../hooks/useAutosave';

interface EditorPageProps {
  documentId: number;
  onBack: () => void;
  userEmail?: string;
  onLogout: () => void;
}

export default function EditorPage({ documentId, onBack, userEmail, onLogout }: EditorPageProps) {
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const autosave = useAutosave(documentId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      autosave.onUpdate(JSON.stringify(editor.getJSON()));
    },
  });

  useEffect(() => {
    getDocument(documentId).then((doc) => {
      setTitle(doc.title);
      setSavedTitle(doc.title);
      if (editor && doc.content) {
        try {
          const parsed = typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
          editor.commands.setContent(parsed);
        } catch {
          editor.commands.setContent(doc.content);
        }
      }
    });
  }, [documentId, editor]);

  const handleTitleBlur = useCallback(async () => {
    if (title !== savedTitle) {
      await renameDocument(documentId, title);
      setSavedTitle(title);
    }
  }, [documentId, title, savedTitle]);

  return (
    <AppShell
      nav={
        <GlobalNav
          userEmail={userEmail}
          onLogout={onLogout}
          left={
            <Button variant="ghost" onClick={onBack}>
              ← Back
            </Button>
          }
        />
      }
    >
      <style>{`
        .ProseMirror { outline: none; min-height: 400px; }
        .ProseMirror p { margin: 0 0 1em; }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 { margin: 1.5em 0 0.5em; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: '1px solid transparent',
            borderRadius: 0,
            padding: '4px 0',
            marginBottom: 16,
            width: '100%',
          }}
          aria-label="Document title"
        />

        {/* Toolbar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Toolbar editor={editor} />
          <AutosaveIndicator status={autosave.status} />
          <Button variant="secondary" onClick={() => setShareOpen(true)} style={{ marginLeft: 'auto' }}>
            Share
          </Button>
        </div>

        {/* Editor content */}
        <EditorContent editor={editor} />
      </div>

      <ShareDialog
        documentId={documentId}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </AppShell>
  );
}
