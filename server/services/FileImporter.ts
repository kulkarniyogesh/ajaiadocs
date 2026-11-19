import path from 'node:path';
import mammoth from 'mammoth';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { parseMd, mdastToTiptap, TiptapJSON, TiptapNode } from '../lib/markdownRoundTrip.js';
import { ValidationError } from '../lib/errors.js';
import type { Element, Text, Root as HastRoot, Node as HastNode } from 'hast';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = new Set(['.txt', '.md', '.docx']);

export interface ImportResult {
  title: string;
  content: TiptapJSON;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateFile(
  _mimetype: string,
  size: number,
  originalname: string,
): void {
  const ext = path.extname(originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ValidationError(
      `File type "${ext || 'unknown'}" is not supported. Accepted types: .txt, .md, .docx`,
    );
  }
  if (size === 0) {
    throw new ValidationError('File is empty.');
  }
  if (size > MAX_SIZE) {
    throw new ValidationError('File exceeds the 5 MB size limit.');
  }
}

// ---------------------------------------------------------------------------
// .txt importer
// ---------------------------------------------------------------------------

export async function importTxt(
  buffer: Buffer,
  filename: string,
): Promise<ImportResult> {
  const text = buffer.toString('utf-8');
  const title = path.basename(filename, '.txt') || 'Untitled document';
  const content: TiptapJSON = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
  return { title, content };
}

// ---------------------------------------------------------------------------
// .md importer
// ---------------------------------------------------------------------------

export async function importMd(
  buffer: Buffer,
  filename: string,
): Promise<ImportResult> {
  const source = buffer.toString('utf-8');
  const tree = parseMd(source);
  const content = mdastToTiptap(tree);
  const title = path.basename(filename, '.md') || 'Untitled document';
  return { title, content };
}

// ---------------------------------------------------------------------------
// .docx importer — server-safe HTML → TiptapJSON via rehype-parse
// No DOM required; mammoth produces HTML, rehype-parse walks the hast tree.
// ---------------------------------------------------------------------------

export async function importDocx(
  buffer: Buffer,
  filename: string,
): Promise<ImportResult> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const content = htmlToTiptap(html);
  const title = path.basename(filename, '.docx') || 'Untitled document';
  return { title, content };
}

// ---------------------------------------------------------------------------
// HTML → TiptapJSON
// ---------------------------------------------------------------------------

function htmlToTiptap(html: string): TiptapJSON {
  const hast = unified().use(rehypeParse, { fragment: true }).parse(html) as HastRoot;
  const blocks = hast.children.flatMap((node) => convertNode(node as HastNode, []));
  return {
    type: 'doc',
    content: blocks.length > 0 ? blocks : [{ type: 'paragraph' }],
  };
}

type Mark = { type: string; attrs?: Record<string, unknown> };

function convertNode(node: HastNode, marks: Mark[]): TiptapNode[] {
  // Text node
  if (node.type === 'text') {
    const value = (node as Text).value;
    if (!value.trim() && !marks.length) return [];
    if (!value) return [];
    const n: TiptapNode = { type: 'text', text: value };
    if (marks.length > 0) n.marks = [...marks];
    return [n];
  }

  if (node.type !== 'element') return [];
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  // --- Headings ---
  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1], 10);
    const content = el.children.flatMap((c) => convertNode(c as HastNode, marks));
    return [{ type: 'heading', attrs: { level }, content }];
  }

  // --- Paragraph ---
  if (tag === 'p') {
    const content = el.children.flatMap((c) => convertNode(c as HastNode, marks));
    return [{ type: 'paragraph', content: content.length > 0 ? content : undefined }];
  }

  // --- Lists ---
  if (tag === 'ul') {
    const items = el.children.flatMap((c) => convertNode(c as HastNode, marks));
    return [{ type: 'bulletList', content: items }];
  }
  if (tag === 'ol') {
    const items = el.children.flatMap((c) => convertNode(c as HastNode, marks));
    return [{ type: 'orderedList', content: items }];
  }
  if (tag === 'li') {
    const children = el.children.flatMap((c) => convertNode(c as HastNode, marks));
    // Wrap bare inline nodes in a paragraph
    const content = children.length > 0 && children.every(isInline)
      ? [{ type: 'paragraph', content: children }]
      : children;
    return [{ type: 'listItem', content }];
  }

  // --- Blockquote ---
  if (tag === 'blockquote') {
    const content = el.children.flatMap((c) => convertNode(c as HastNode, marks));
    return [{ type: 'blockquote', content }];
  }

  // --- Code block ---
  if (tag === 'pre') {
    const text = extractText(el);
    return [{ type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text }] }];
  }

  // --- Horizontal rule ---
  if (tag === 'hr') return [{ type: 'horizontalRule' }];
  if (tag === 'br') return [{ type: 'hardBreak' }];

  // --- Inline marks ---
  if (tag === 'strong' || tag === 'b') {
    return el.children.flatMap((c) =>
      convertNode(c as HastNode, [...marks, { type: 'bold' }]),
    );
  }
  if (tag === 'em' || tag === 'i') {
    return el.children.flatMap((c) =>
      convertNode(c as HastNode, [...marks, { type: 'italic' }]),
    );
  }
  if (tag === 'u') {
    return el.children.flatMap((c) =>
      convertNode(c as HastNode, [...marks, { type: 'underline' }]),
    );
  }
  if (tag === 'code') {
    return el.children.flatMap((c) =>
      convertNode(c as HastNode, [...marks, { type: 'code' }]),
    );
  }
  if (tag === 'a') {
    const href = el.properties?.href as string | undefined;
    return el.children.flatMap((c) =>
      convertNode(c as HastNode, [
        ...marks,
        { type: 'link', attrs: { href: href ?? '', target: '_blank' } },
      ]),
    );
  }

  // --- Skip non-content elements entirely ---
  if (['table', 'img', 'figure', 'script', 'style', 'head', 'svg'].includes(tag)) {
    return [];
  }

  // --- Transparent containers (div, span, section, article, body, etc.) ---
  const children = el.children.flatMap((c) => convertNode(c as HastNode, marks));
  // If all children are inline nodes, wrap them in a paragraph
  if (children.length > 0 && children.every(isInline)) {
    return [{ type: 'paragraph', content: children }];
  }
  return children;
}

function extractText(node: HastNode): string {
  if (node.type === 'text') return (node as Text).value;
  if (node.type === 'element') {
    return (node as Element).children.map(extractText).join('');
  }
  return '';
}

function isInline(n: TiptapNode): boolean {
  return ['text', 'hardBreak'].includes(n.type);
}
