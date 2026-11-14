# Test records — the convention

Two small files replace the old per-plugin debt ledger (retired 2026-11-14, ADR-009; the ledgers
themselves sit in `archive/`). They are written in the round that needs them, not in a later session.

## 1. Unrun cases — `<cwd>/.agents/test-debt/unrun-cases.md`

One row per case that **exists and has never executed**:

| field | meaning |
|---|---|
| case | the full automation name |
| why | `red` (expected to fail on a known defect) / `new` (written, no run yet) / `inert` (renamed or moved since its run, body unchanged) |
| next tier | round / push gate / release |
| owner, deadline | required for `red`; a **core**-layer red blocks the push gate, a non-core red does not, but the gate's report must list every red it met |

Cap: about ten rows. More means a run is overdue.

## 2. Manual checks — `<cwd>/.agents/test-debt/manual-checks.md`

One row per behaviour no headless case can reach (RHI, an audio device, a local player, a dedicated
server target, a cook, several clients): the behaviour, the procedure that checks it, and whether it
was performed. A behaviour that becomes reachable moves out of here into a case.

## Rules that keep these honest

- A behaviour with **no case** is not a row here: it gets its case in the round that changes it.
- Two classes never leave a commit unproven: externally visible behaviour and bug fixes.
- The ledger form is gone because a deferred *description* rots: by the time a later session reads
  it, the code may disagree (measured three times in 2026-11 - see `archive/`).
- A renamed, dropped or merged case is one row in `case-renames.md`, which sits next to the layer
  table, so a record that cites an old name stays resolvable.
- `archive/` holds the pre-2026-11-14 ledgers, for history only.
