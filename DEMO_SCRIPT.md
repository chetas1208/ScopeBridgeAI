# ScopeBridge AI — Demo Script

**Duration:** 3-5 minutes
**Setup:** Open the app at localhost:3000 (or deployed URL)

---

## The Story

You're a PM at a small agency. Your team is building a Patient Intake Portal for Acme Health. Things are about to go wrong — but ScopeBridge catches it before it becomes a disaster.

---

## Step 1: "Acme Health asked for SSO in email."

> "Dr. Chen emailed asking if SSO can be ready before the pilot launch. Her IT department requires it for compliance."

Point to the **Source Event** in the Activity Feed showing the Gmail sync.

---

## Step 2: "PM casually said we can probably make it work."

> "Marcus, the PM, replied in Slack: 'We should be able to make it work.' No ticket was created. No engineering estimate was requested."

Point to the **Client Promise Ledger** showing the SSO promise with "At Risk" status.

---

## Step 3: "Engineering never got a ticket."

> "Look at the Missing Ticket Detector. ScopeBridge found that SSO was requested by the client but no matching GitHub issue exists. It offers to create an issue draft."

Click **"Create GitHub Issue Draft"** to show the action.

---

## Step 4: "GitHub shows backend deployment is blocked."

> "Meanwhile, GitHub Issue #42 shows the backend deployment has been blocked for 5 days waiting on API keys. This affects everything — including the CSV export that was promised by May 10."

Point to the **Delivery Risk Board** showing the "blocked delivery" risk.

---

## Step 5: "The client update says everything is on track."

> "But here's the dangerous part. Marcus drafted a client update email that says 'we are on track for the May 12 go-live.' That's not true."

Point to the **Engineering Reality Check** showing the contradiction between the client email and GitHub status.

---

## Step 6: "ScopeBridge catches everything."

> "ScopeBridge detected 6 delivery risks:
> - **Missing ticket** — SSO has no engineering work
> - **Scope drift** — SSO and mobile demo are outside original scope
> - **Contradiction** — Client update contradicts engineering reality
> - **Deadline risk** — Go-live moved from May 15 to May 12
> - **Missed commitment** — CSV export promised by May 10
> - **Engineering blocker** — API keys blocking backend for 5 days"

Show the **Hero Metrics** and **Risk Score** (78 — High).

---

## Step 7: "It generates an honest client update."

> "ScopeBridge generated an honest, professional client email that acknowledges the backend blocker, explains the SSO timeline impact, and proposes a sync call — instead of the misleading 'everything is on track' message."

Scroll to the **Client Update Draft** panel. Show the email content.

---

## Step 8: "Every claim has source evidence."

> "Click on any risk card's 'View Evidence' button. ScopeBridge shows you the exact quote, the source, the author, and why it matters. No hallucinated claims. Every insight is traceable."

Click **View Evidence** on any risk to open the drawer.

---

## Closing

> "ScopeBridge AI prevents client delivery failure by connecting client communication to engineering reality. It catches the gaps that spreadsheets, standups, and Slack channels miss."

**Where client promises meet engineering reality.**
