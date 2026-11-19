import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import type {
  Root,
  Node,
  Heading,
  Paragraph,
  Strong,
  Emphasis,
  Text,
  InlineCode,
  Code,
  List,
  ListItem,
  Blockquote,
  ThematicBreak,
} from 'mdast'

export interface TiptapJSON { type: 'doc'; content: TiptapNode[] }
export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  content?: TiptapNode[]
  text?: string
}

// ---------------------------------------------------------------------------
// parseMd
// ---------------------------------------------------------------------------

export function parseMd(source: string): Root {
  return unified().use(remarkParse).parse(source)
}

// ---------------------------------------------------------------------------
// serializeMd
// ---------------------------------------------------------------------------

export function serializeMd(tree: Root): string {
  return unified().use(remarkStringify).stringify(tree)
}

// ---------------------------------------------------------------------------
// mdastToTiptap
// ---------------------------------------------------------------------------

export function mdastToTiptap(tree: Root): TiptapJSON {
  return {
    type: 'doc',
    content: (tree.children as Node[]).map(convertBlock),
  }
}

// --- block conversion -------------------------------------------------------

function convertBlock(node: Node): TiptapNode {
  switch (node.type) {
    case 'heading': {
      const h = node as Heading
      return {
        type: 'heading',
        attrs: { level: h.depth },
        content: convertInlineChildren(h.children as Node[]),
      }
    }

    case 'paragraph': {
      const p = node as Paragraph
      return {
        type: 'paragraph',
        content: convertInlineChildren(p.children as Node[]),
      }
    }

    case 'code': {
      const c = node as Code
      return {
        type: 'codeBlock',
        attrs: { language: c.lang ?? null },
        content: [{ type: 'text', text: c.value }],
      }
    }

    case 'list': {
      const l = node as List
      return {
        type: l.ordered ? 'orderedList' : 'bulletList',
        content: (l.children as Node[]).map(convertBlock),
      }
    }

    case 'listItem': {
      const li = node as ListItem
      return {
        type: 'listItem',
        content: (li.children as Node[]).map(convertBlock),
      }
    }

    case 'blockquote': {
      const bq = node as Blockquote
      return {
        type: 'blockquote',
        content: (bq.children as Node[]).map(convertBlock),
      }
    }

    case 'thematicBreak': {
      return { type: 'horizontalRule' }
    }

    default:
      return { type: 'text', text: extractText(node) }
  }
}

// --- inline conversion ------------------------------------------------------

function convertInlineChildren(nodes: Node[]): TiptapNode[] {
  return nodes.flatMap((n) => convertInline(n, []))
}

function convertInline(
  node: Node,
  inheritedMarks: Array<{ type: string; attrs?: Record<string, unknown> }>,
): TiptapNode[] {
  switch (node.type) {
    case 'text': {
      const t = node as Text
      const result: TiptapNode = { type: 'text', text: t.value }
      if (inheritedMarks.length > 0) result.marks = [...inheritedMarks]
      return [result]
    }

    case 'inlineCode': {
      const ic = node as InlineCode
      const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [
        ...inheritedMarks,
        { type: 'code' },
      ]
      return [{ type: 'text', text: ic.value, marks }]
    }

    case 'strong': {
      const s = node as Strong
      const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [
        ...inheritedMarks,
        { type: 'bold' },
      ]
      return (s.children as Node[]).flatMap((child) =>
        convertInline(child, marks),
      )
    }

    case 'emphasis': {
      const em = node as Emphasis
      const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [
        ...inheritedMarks,
        { type: 'italic' },
      ]
      return (em.children as Node[]).flatMap((child) =>
        convertInline(child, marks),
      )
    }

    default:
      return [{ type: 'text', text: extractText(node) }]
  }
}

// --- text extraction fallback -----------------------------------------------

function extractText(node: Node): string {
  if ('value' in node && typeof (node as unknown as { value: unknown }).value === 'string') {
    return (node as unknown as { value: string }).value
  }
  if ('children' in node) {
    return ((node as unknown as { children: Node[] }).children ?? [])
      .map(extractText)
      .join('')
  }
  return ''
}
