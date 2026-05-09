# ScopeBridge AI

**Where client promises meet engineering reality.**

ScopeBridge AI is a client-delivery intelligence system that detects delivery risk, scope drift, forgotten commitments, and contradictions between what teams promise clients and what engineering actually delivers.

## The Problem

Every client project has the same failure mode:

1. A client asks for something in an email or meeting.
2. The PM says "yes" or "we'll figure it out."
3. Engineering never receives a clear ticket.
4. Two days before demo day, everyone realizes the promise was never implemented.

This gap between **client communication** and **engineering execution** causes missed deadlines, scope creep, angry clients, and confused teams.

## What ScopeBridge Does

ScopeBridge AI ingests business/client context and technical execution context, then automatically detects:

- **Missing Tickets** — Client asks with no matching engineering work
- **Scope Drift** — Requests outside the original agreement
- **Contradictions** — Client-facing updates that don't match engineering reality
- **Forgotten Commitments** — Promises with overdue deadlines
- **Delivery Risk** — A computed 0-100 score from multiple risk factors
- **Requirements Traceability** — Visual chain from client email → requirement → ticket → status

## Research Basis

- **Requirements Traceability**: Every client ask is traceable from origin to requirement, technical ticket, implementation status, and client update.
- **Socio-Technical Congruence**: Delivery fails when communication patterns don't match technical dependencies.
- **Organizational Memory**: The system acquires, retains, and retrieves decisions, promises, blockers, and requirements across time.

## Primary Users

- Founders managing client deliverables
- Product managers translating client asks into engineering tasks
- Customer success managers tracking promises
- Engineering leads identifying hidden client risk
- Agency/consulting teams managing project scope

## Features

| Feature | Description |
|---------|-------------|
| Delivery Risk Board | 0-100 risk score with categorized risk cards |
| Client Promise Ledger | Every commitment tracked with owner, deadline, and status |
| Scope Drift Detector | Automatic detection of out-of-scope requests |
| Missing Ticket Detector | Client asks without matching GitHub issues |
| Engineering Reality Check | Client-facing claims vs. actual engineering status |
| Traceability Graph | Visual chain showing broken links in the delivery pipeline |
| Activity Feed | Real-time event stream from all connected sources |
| Client Update Generator | Honest, professional client emails based on real status |

## Tech Stack

- **Framework**: Next.js App Router (TypeScript)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Validation**: Zod
- **AI Model**: Pipeshift (configurable, with deterministic fallback)
- **Memory Layer**: HydraDB (optional, with in-memory fallback)
- **Deployment**: Render-ready

## Local Setup

```bash
# Clone the repo
git clone <repo-url>
cd ContextPilot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

The app runs at `https://scope-bridge-ai.vercel.app`.

**No database or API keys needed for demo mode.** The app works fully with demo data.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DEMO_MODE` | No | Set to `true` for demo mode (default) |
| `PIPESHIFT_API_KEY` | No | Enables AI-powered analysis |
| `DATABASE_URL` | No | PostgreSQL connection for persistence |
| `GOOGLE_CLIENT_ID` | No | Enables Gmail integration |
| `GITHUB_TOKEN` | No | Enables GitHub integration |

## Render Deployment

**Build command:**
```bash
npm install && npm run build
```

**Start command:**
```bash
npm start
```

The app automatically uses `PORT` from the environment.

## Demo Script

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) for a step-by-step demo walkthrough.

**Quick demo:**
1. Open the app → Click "Load Demo Workspace"
2. See the Acme Health scenario with real delivery risks
3. Explore risk board, promise ledger, scope drift, traceability graph
4. View evidence for any finding
5. Read the generated client update email

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── integrations/         # Integration management
│   ├── settings/             # Workspace settings
│   └── api/
│       ├── analyze/          # Run analysis agents
│       ├── ingest/           # Ingest source events
│       ├── risks/            # Delivery risks
│       ├── client-update/    # Generate client updates
│       ├── realtime/         # SSE stream
│       └── integrations/     # Gmail, Outlook, Slack, GitHub
├── components/               # 15+ reusable UI components
└── lib/
    ├── types.ts              # Domain types
    ├── mockData.ts           # Acme Health demo scenario
    ├── agents.ts             # AI analysis agents
    ├── riskScoring.ts        # Delivery risk scoring engine
    ├── validators.ts         # Zod API schemas
    └── pipeshift.ts          # LLM integration
```

## Hackathon Judging Angle

**ScopeBridge AI solves a real, painful problem** that every team with client-facing commitments experiences. It's not a generic chatbot — it's a purpose-built intelligence system for the dangerous gap between business promises and engineering reality.

The product includes:
- A working demo with realistic data that tells a compelling story
- Real integration scaffolding for Gmail, Slack, and GitHub
- AI-powered analysis with deterministic fallback
- Professional, domain-specific UI design

**Winning message:** ScopeBridge AI prevents client delivery failure by connecting client communication to engineering reality.
