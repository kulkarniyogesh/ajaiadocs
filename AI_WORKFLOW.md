# AI Workflow Note — Ajaia Docs

## Tools Used

**Kiro IDE** — an AI-powered development environment built on VS Code. All development was done inside Kiro, using its agentic coding assistant to implement features, debug issues, and refactor code across the entire session.

---

## How AI Was Used

### 1. Architecture & Planning
The AI helped design the overall system: state-machine routing in React, the serverless function wrapper pattern, the lazy Supabase client initialization (critical for fixing 502s), and the file import pipeline.

### 2. Feature Implementation
Full features were implemented through iterative conversation:
- TipTap editor integration with autosave
- JWT auth with brute-force lockout
- File import pipeline (`.txt`, `.md`, `.docx` → TipTap JSON) using `mammoth` and `remark`
- Supabase Storage integration with signed URL generation
- Reference design (`ux/code.html`) applied pixel-accurately to React components

### 3. Database Migration
The AI handled the full SQLite → Supabase Postgres migration: replaced `better-sqlite3` synchronous queries with async `pg` Pool queries and parameterised `$1/$2` placeholders across all services.

### 4. Netlify Deployment Debugging
Several deployment issues were diagnosed and fixed through AI-assisted debugging:
- **502 on cold start** — identified that `createClient()` and `new Pool()` were called at module load time before env vars were injected; fixed with lazy getters
- **ENOTFOUND on Postgres** — identified that Netlify blocks outbound TCP/5432; switched to Supabase PostgREST HTTP API
- **WebSocket warning** — polyfilled `globalThis.WebSocket` with the `ws` package for Node < 22

### 5. UI/UX Polish
- Shimmer skeleton loaders matching the exact row/grid card dimensions
- Portal-based context menu to escape `overflow: hidden` clipping
- Tab navigation wired to separate pages (Shared with Me, Recent)
- Status filter pills synced bidirectionally with nav tabs

---

## What Was Human-Directed

- Product requirements and feature scope
- Reference design (`ux/code.html`) provided as the visual specification
- Supabase credentials and project setup
- Approval of each significant change before deployment
- Final deployment to Netlify and env var configuration

---

## Lessons

The most impactful AI contribution was **diagnosing environment-specific failures** that would have taken significant manual debugging — specifically the Netlify TCP block and the module-load-time env var issue. These are problems that require understanding the full execution context (Lambda lifecycle, Netlify's network restrictions), which the AI reasoned through systematically from error messages alone.
