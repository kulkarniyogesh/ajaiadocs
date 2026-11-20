# Architecture Note — Ajaia Docs

## Overview

Ajaia Docs is a single-page application with a serverless API backend. The frontend and backend share no runtime process — they communicate exclusively over HTTP.

```
Browser (React SPA)
        │
        │  HTTPS  /api/*
        ▼
Netlify CDN  ──→  Netlify Function (api.ts)
                        │
                        ├── Supabase PostgREST  (DB reads/writes over HTTPS)
                        └── Supabase Storage    (file uploads over HTTPS)
```

---

## Frontend

**Framework:** React 18 with TypeScript, bundled by Vite.

**Routing:** State-machine routing in `App.tsx` — no router library. Views are `login | list | shared-with-me | recent | editor`. Navigation is a prop-drilled `onTabChange` callback, keeping routing logic in one place.

**Editor:** TipTap (ProseMirror wrapper) with StarterKit, Underline, and Heading extensions. Document content is stored as TipTap JSON.

**Autosave:** `useAutosave` hook debounces content changes by 1 second, then calls `PUT /api/documents/:id`. An `AutosaveIndicator` component surfaces save status.

**Optimistic UI:** Document list updates immediately on delete; the API call runs in the background.

**Skeleton loading:** `SkeletonLoader` renders layout-matched shimmer cards (list row or grid card variant) so the perceived load time is lower.

---

## Backend

**Runtime:** Node.js 20, TypeScript compiled by ts-node (dev) or esbuild (Netlify production).

**API:** Express with four route groups:
- `POST /api/auth/login|logout` — JWT issuance and revocation
- `GET|POST|PUT|PATCH|DELETE /api/documents/:id` — CRUD
- `GET|POST|DELETE /api/documents/:id/share` — access grants
- `POST /api/import` — multipart file upload → TipTap JSON conversion

**Authentication:** Stateless JWT (HS256, 24h expiry). Revoked tokens are stored in a `revoked_tokens` table checked on every request.

**Rate limiting / lockout:** Five consecutive failed logins lock an account (tracked in `login_attempts`).

---

## Database (Supabase / PostgreSQL)

Schema — five tables:

| Table | Purpose |
|-------|---------|
| `users` | Accounts (email + bcrypt hash) |
| `login_attempts` | Brute-force lockout tracking |
| `documents` | Content (TipTap JSON), title, `storage_path` |
| `access_grants` | Collaborator permissions per document |
| `revoked_tokens` | JWT denylist |

**Connections:** In development, `pg` Pool connects directly over TCP/5432. On Netlify Functions, TCP is blocked, so all DB access uses **Supabase PostgREST** (HTTP REST API via `@supabase/supabase-js`), keeping it within Netlify's allowed HTTPS-only egress.

---

## File Storage (Supabase Storage)

Uploaded files (`.md`, `.txt`, `.docx`) are stored in the `docs` bucket at `uploads/{docId}/{timestamp}_{filename}`. The raw file is stored after the content is parsed into TipTap JSON, so the editor works even if storage is temporarily unavailable (non-fatal path).

---

## File Import Pipeline

```
multipart upload
      │
      ▼
  validateFile()
      │
  ┌───┴──────────────────┐
  │ .txt  │  .md  │ .docx │
  │ plain │remark │mammoth│
  │ text  │ parse │ →HTML │
  └───┬───┴───┬───┴───┬───┘
      │       │       ▼
      │       │  htmlToTiptap()
      │       ▼       │
      │  mdastToTiptap()
      └───────┴───────┘
              │
              ▼
        TipTap JSON  →  saved to documents.content
```

---

## Key Design Decisions

**Single serverless function:** Rather than one function per route (which would require a framework like `@netlify/functions` router), the entire Express app is wrapped with `serverless-http`. This keeps the backend DRY and makes local dev identical to production.

**No WebSocket / real-time:** Supabase Realtime requires WebSockets, which Netlify Functions don't support. The app uses polling-on-focus (`window.addEventListener('focus', refresh)`) for a good-enough live-update experience without infrastructure complexity.

**Lazy client init:** Supabase client and pg Pool are initialized on the first function invocation, not at module load time. This avoids the 502 errors caused by missing environment variables during the Lambda cold-start module evaluation phase.

**Content-first import:** File content is parsed to TipTap JSON before the document record is created. If parsing fails, no orphan record is left in the database.
