# Submission — Ajaia Docs

## What Is Included

| Item | Location |
|------|----------|
| **Source code** | This repository (`ajaiadocs`) |
| **Local setup & run instructions** | `README.md` |
| **Architecture note** | `ARCHITECTURE.md` |
| **AI workflow note** | `AI_WORKFLOW.md` |
| **This submission index** | `SUBMISSION.md` |
| **Live product URL** | https://ajaiadocs-p5ut.netlify.app |
| **Walkthrough video URL** | `WALKTHROUGH.txt` |
| **Reference UX design** | `ux/code.html`, `ux/DESIGN.md`, `ux/screen.png` |

---

## Live Product

**URL:** https://ajaiadocs-p5ut.netlify.app

**Demo credentials (pre-seeded):**
- `alice@example.com` / `password123`
- `bob@example.com` / `password123`

To test sharing: log in as Alice, create a document, share it with `bob@example.com`, then log in as Bob to see it under "Shared with Me".

---

## Features Implemented

- **Authentication** — JWT login/logout with bcrypt password hashing and 5-strike account lockout
- **Rich-text editor** — TipTap (ProseMirror) with Bold, Italic, Underline, Headings H1–H3, Bullet list, Numbered list
- **Autosave** — 1-second debounce, persistent status indicator
- **Document list** — List and Grid views, filter by title, status tabs (All / Owned / Shared), tag pills
- **Separate pages** — "Shared with Me" and "Recent" open as dedicated pages; home shows 5 latest docs
- **Document sharing** — Share by email, revoke access, collaborator list
- **File import** — `.txt`, `.md` (full remark parse), `.docx` (mammoth → HTML → TipTap); stored in Supabase Storage
- **Template scaffold** — 5 starter templates: Blank, PRD, Technical Spec, Meeting Notes, ADR
- **Export** — Export any document as `.md` file download
- **Context menu** — Portal-rendered actions menu (share, export, delete) that never clips under overflow
- **Skeleton loading** — Shimmer skeleton cards matching list/grid layout during data fetch
- **Responsive design** — Matches `ux/code.html` reference with Material Symbols icons, Inter font, indigo/emerald color scheme
- **Serverless deployment** — Full Express API wrapped in a single Netlify Function; Supabase PostgREST for DB (no TCP)

---

## Repository

https://github.com/kulkarniyogesh/ajaiadocs

Branch: `main`
