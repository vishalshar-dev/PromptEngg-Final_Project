# Project memory

## Product intent & audience

- CartAudit: a personal shopping/finance audit web app for tracking cart activity, budgets, and transactions.
- Audience: individual users wanting to monitor and control shopping spend, detect fees, and lock "junk" purchases.

## Brand personality & voice

- Action-oriented with playful, slightly humorous tone (e.g., "War Room", "broke mode", "junk purchases").
- Utility-first framing with personality in feature naming.

## Visual design & UX direction

- App composed of multiple feature surfaces:
  - Quick mart grid for adding items
  - Cart drawer with checkout flow
  - Transaction ledger with bill splitting
  - Budget radar dashboard with category breakdown
  - Receipt scanner with fee detection and price trend tracking
  - Audit report exporter
  - "War Room" with broke mode to lock junk purchases
- Implied layout: dashboard-style with panels/cards per feature; grid-based item selection; slide-out/drawer pattern for cart.

## Decisions, constraints & rationale

- Framework: Vite + React.
- Build verified passing cleanly; all component files have real content and are complete.
- No errors were found during the audit pass — app was already in a working state.
- Deployment readiness: app builds successfully and is functionally complete.

## Open questions & assumptions

- Deployment target (platform/host) not yet specified.
- No explicit errors were encountered despite the stated goal of "fixing errors"; prior session state is unknown.
- Backend/data persistence approach is unclear (localStorage vs. API vs. in-memory state) — not inspected this turn.
- No tests were run beyond the production build.