import React from 'react';
import { type Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
}

const buttonBaseStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 'var(--space-1) var(--space-2)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-text-secondary)',
  transition:
    'background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
};

const buttonActiveStyle: React.CSSProperties = {
  background: 'var(--color-brand-100)',
  color: 'var(--color-brand-700)',
};

const buttonHoverStyle: React.CSSProperties = {
  background: 'var(--color-interactive-secondary)',
  color: 'var(--color-text-primary)',
};

interface FormatButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function FormatButton({ label, isActive, onClick }: FormatButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const style: React.CSSProperties = {
    ...buttonBaseStyle,
    ...(isActive ? buttonActiveStyle : hovered ? buttonHoverStyle : {}),
  };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

const separatorStyle: React.CSSProperties = {
  width: '1px',
  height: '20px',
  background: 'var(--color-border-subtle)',
  margin: '0 var(--space-1)',
};

function Separator() {
  return <div style={separatorStyle} />;
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) var(--space-3)',
        borderBottom: '1px solid var(--color-border-subtle)',
        flexWrap: 'wrap',
      }}
    >
      <FormatButton
        label="B"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <FormatButton
        label="I"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <FormatButton
        label="U"
        isActive={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />

      <Separator />

      <FormatButton
        label="H1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <FormatButton
        label="H2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <FormatButton
        label="H3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Separator />

      <FormatButton
        label="• List"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <FormatButton
        label="1. List"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
    </div>
  );
}
