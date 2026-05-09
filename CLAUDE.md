# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ScopeBridge AI - a client-delivery intelligence system that detects delivery risk, scope drift, forgotten commitments, and contradictions between client promises and engineering reality.

## Commands

```bash
npm run dev      # Dev server on :3000
npm run build    # Production build — must pass before committing
npm run lint     # ESLint
npm run start    # Production server (uses $PORT)

npx prisma generate     # Regenerate Prisma client (also runs postinstall)
npx prisma db push      # Push schema changes to DB
npx prisma studio       # Browse DB in browser
```

## Environment

See `.env.example` for all variables. Minimum to run locally with no external deps:

```env
DEMO_MODE=false
AUTH_SECRET=<any-random-string>
DATABASE_URL=<postgres-connection-string>
```

With `DEMO_MODE=false` and no `PIPESHIFT_API_KEY`, the audit pipeline falls back to deterministic pattern matching. Set `DEMO_MODE=true` to skip all real data and serve the hardcoded Acme Health scenario from `src/lib/mockData.ts`.

## Architecture

### Data Flow

```
Source events (Gmail/Slack/GitHub/manual)
  → ingested via /api/ingest/* and /api/sync/*
  → stored as SourceItem in Postgres
  → /api/audit/run triggers runClientPromiseAudit() in src/lib/agents.ts
  → agents call Pipeshift LLM → deterministic fallback → demo data
  → DeliveryRisk rows written to DB
  → action drafts generated via /api/actions/*
```

### Three-tier fallback in agents.ts

Every AI call follows: **Pipeshift LLM** (if `PIPESHIFT_API_KEY` set) → **deterministic pattern match** → **demo mock data** (if `DEMO_MODE=true`). Never crashes without keys.

### Auth

NextAuth v5 with Prisma adapter, database sessions. GitHub + Google OAuth providers. `src/proxy.ts` (not `middleware.ts`) exports `auth` as the Next.js middleware proxy - this is required for Next.js 16 compatibility.

### Dashboard

Multi-page layout at `/dashboard/*`. `src/app/dashboard/layout.tsx` wraps all pages with `<Sidebar>` + `<Topbar>` and provides `<SessionProvider>`. Dashboard pages are client components (`"use client"`).

### AI Integration (Pipeshift)

`src/lib/pipeshift.ts` wraps any OpenAI-compatible API. Configured via:
- `PIPESHIFT_API_KEY`
- `PIPESHIFT_BASE_URL`
- `MODEL_NAME`

### Memory Layer (HydraDB)

`src/lib/hydradb.ts` wraps the HydraDB API for long-context organizational memory. Optional - only used when `HYDRADB_API_KEY` is set.

## Key Libraries & Patterns

- **Tailwind CSS v4** - custom design tokens in `globals.css` as CSS variables (`:root`), not in a config file
- **Design system classes**: `.glass-card`, `.btn-primary`, `.btn-secondary`, `.fade-in`, `.pulse-dot` defined in `globals.css`
- **Accent colors**: `--accent-mint`, `--accent-lavender`, `--accent-cyan`, `--accent-rose`
- **Recharts** for data visualization in dashboard pages
- **Zod** for API request validation
- Any component using `useState`, `useEffect`, or browser APIs needs `"use client"` at the top

## Prisma Models

Core domain models: `Workspace` (multi-tenant) → `WorkspaceMember`, `ConnectedAccount` (OAuth tokens), `SourceItem` (ingested events), `AuditRun` → `DeliveryRisk` → `ActionDraft`/`ActionExecution`. Auth models: standard Auth.js `User`/`Account`/`Session`/`VerificationToken`.

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/audit` | Run audit on provided source events (body) |
| `POST /api/audit/run` | Run audit against workspace's stored SourceItems |
| `POST /api/ingest/manual` | Manually ingest a source event |
| `POST /api/sync/gmail\|slack\|github` | Pull latest events from connected integrations |
| `POST /api/actions/client-email\|github-issue\|slack-escalation` | Generate action draft for a risk |
| `GET /api/health` | Check all integration statuses |
| `POST /api/integrations/connect` | Initiate OAuth for an integration |
| `POST /api/integrations/github/webhook` | GitHub webhook receiver |
