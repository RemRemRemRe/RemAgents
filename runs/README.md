# Run directory convention

The execution artifact layer for delegated subagent work. Raw output lives
here; the main session keeps only bounded reports and pointers.

This file and `_template/` are **tracked** in the RemAgents repository.
Everything else under this directory is **ignored** (`runs/.gitignore`),
because run artifacts contain project-specific paths, code and test names.
Install this directory as a junction (`<cwd>/.agents/runs` -> `<repo>/runs`) so
the convention document and the artifacts share one path.

## Layout

```
<cwd>/.agents/runs/<run-id>/
  brief.md    # written by the main session (the delegation brief)
  state.md    # append-only progress / local decisions, written by the executor
  *.log       # raw command output
  report.md   # full report; the final message is a summary + pointer
```

- `<run-id>`: `<YYYYMMDD-HHmm>-<stage>-<slug>` — e.g. `20260901-1430-verify-ability-tags`
- `<stage>`: the profile name that owns the run (`author`, `review`, `verify`, …)
- Write ownership: only the run's executor writes its own `state.md` / logs /
  `report.md`; the main session only reads.
- If the brief does not name a run directory, the executor creates one and
  reports its path in the `DETAIL:` line.
- The directory is git-ignored by the project (`.agents` is ignored). Clean up
  manually; keeping the last ~7 days or ~20 runs is enough.

## Why

Subagent work is invisible to the main session except for its final message.
Persisting raw material on disk lets the main session:

- read a 20-line `report.md` instead of a 3000-line build log;
- recover task state after context compaction;
- audit what a background run actually did after the fact.

## Contracts

### Brief (main session -> executor)

```md
## OBJECTIVE
<one line, verifiable>
## SCOPE
- allowed: <files / modules / symbols>
- forbidden: <…>
## CONSTRAINTS
- standards: <skill names>
- environment: <where commands/paths come from>
## ACCEPTANCE
- [ ] <checkable condition>
## REPORT
- run dir: <run-id or "create one">
```

Missing **blocking** information -> the executor returns `RESULT: blocked` and
lists the gaps; it never guesses. Non-blocking gaps -> listed under `ASSUMPTIONS`.

### Report (executor -> main session)

The final assistant message is the only channel back, and it is inserted
verbatim into the main session's context. Keep it <= 40 lines / 4000 chars.

```
RESULT:   <done | blocked | failed> — one line
CHANGES:  <file:line, or "none">
EVIDENCE: <command + key output lines + exit code>
RISKS:    <unresolved / uncovered / unverified>
NEXT:     <1-3 suggested next steps>
DETAIL:   <run-dir path>
```

Rules:

- every claim carries evidence (a command with its exit code, or `file:line`);
- never paste logs — write them to the run dir and reference the path;
- failures must be attributed to a **brief defect / execution defect /
  environment defect**, because that decides whether the parent rewrites the
  brief, re-delegates, or fixes the environment.
