# Project memory

## Product intent & audience

- CartAudit: personal shopping/finance audit web app for tracking cart activity, budgets, and transactions.
- Audience: individual users wanting to monitor and control shopping spend, detect fees, and lock "junk" purchases.

## Brand personality & voice

- Action-oriented with playful, slightly humorous tone (e.g., "War Room", "broke mode", "junk purchases").
- Utility-first framing with personality in feature naming.

## Visual design & UX direction

- Tab-based navigation across three primary surfaces plus a distinct mode screen:
  - **Mart tab** — Quick Mart grid with custom items; transaction ledger with bill splitting.
  - **Audit tab** — Session budget guardrail, multi-app cart comparator, receipt scanner, fee detector, saved audit history, price trend tracker, report exporter, JSON data backup/restore.
  - **Radar tab** — Editable monthly budget with circular progress ring; per-category spending caps with visual over-cap alerts.
  - **War Room** — Broke mode to lock junk purchases.
- Implied layout: dashboard-style with panels/cards per feature; grid-based item selection; circular progress ring for budget visualization.

## Decisions, constraints & rationale

- Framework: Vite + React.
- Build verified passing cleanly with zero errors; all features intact and functionally complete.
- Data persistence: localStorage (budgets, caps, transactions, saved audits, custom items) — confirmed, not just assumed.
- No errors found despite stated "fixing errors" goal; app was already in a working state.
- Deployment readiness: app builds successfully and is usable as-is.

## Open questions & assumptions

- Deployment target (platform/host) not yet specified.
- No explicit errors were encountered; prior session state is unknown.
- No tests were run beyond the production build.
- No user-requested feature changes have been made; app remains as previously built.