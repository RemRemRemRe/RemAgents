# RemAgents

pi-web subagent profiles for the Rem project — a small collection of
[pi-web](https://github.com/agegr/pi-web) built-in subagent profiles organized
by **workflow stage** (recon → plan → author → review → verify → debug → git),
built around a **decision/execution boundary**: the main session keeps only
decision context, while executors are self-contained and return bounded,
evidence-backed reports.

> **中文版**: [README.zh-CN.md](README.zh-CN.md)

Both language versions are maintained in lockstep — the one-liners mirror each
profile's own `description`/`display_name`. When a profile changes, update
both files in the same change.

## What's Inside

| profile | display name | workflow stage | tools | focus |
|---|---|---|---|---|
| `recon` | Repo Recon | fact gathering | read-only | resolve queryable facts read-only; returns a `file:line` fact sheet, never prose |
| `grill` | Plan & Decision | decision analysis | read-only | batch-grill-with-docs: decision graph + frontier of open questions with recommendations |
| `author` | Code Authoring | code + test authoring | full | implement one decided work unit, self-verified by compiling the affected target |
| `review` | Code Review | unified-style review | read-only | cpp best-practices checklist, layered BDD test-tree audit, test completeness, codebase audit |
| `verify` | Build & Test | compile + headless tests | full | test-completeness gate, build, headless test run; logs to disk |
| `debug` | Debugging | runtime root-cause | full | debugger-driven evidence chain, root cause, fix proposal |
| `git` | Git & Commit | submodule updates + commit | full | submodule sync/push, single-responsibility commits, history rewrite, build+test gate |
| `skill-authoring` | Skill Authoring | meta (maintaining skills) | full | skill writing, generalization, MCP server authoring, knowledge capture |

## The Boundary Model

The split axis is **context weight × decision coupling**, not "thinking vs
execution": exploration is thinking *and* the heaviest context load, while
execution contains decisions (commit splits, fix strategies, test selection).

| | low coupling | high coupling |
|---|---|---|
| **high weight** | delegate (build, test, git, bulk search) | split: gather evidence in an executor, judge in the main session |
| **low weight** | do it in the main session (delegation is net cost) | do it in the main session |

Three layers:

1. **Main session = decision ledger.** Goal, constraints, acceptance criteria,
   decision log, plan, fact map, artifact pointers. It does *not* hold build
   logs, large file contents, or full diffs.
2. **Executors = three contracts.** *Brief in* (OBJECTIVE / SCOPE /
   CONSTRAINTS / ACCEPTANCE / REPORT), *execution rules* (skills, self-verify
   loop, allowed/forbidden actions, stop conditions), *report out* (bounded
   skeleton below).
3. **Artifacts on disk.** `<cwd>/.agents/runs/<run-id>/` holds `brief.md`,
   `state.md`, `*.log`, `report.md` — so isolation survives context compaction
   and background runs.

### Report contract

The subagent's final message is the only channel back and lands verbatim in the
parent's context, so it is capped at ~40 lines:

```
RESULT:   done | blocked | failed
CHANGES:  <file:line, or none>
EVIDENCE: <command + key output lines + exit code>
RISKS:
NEXT:
DETAIL:   <run-dir path>
```

Every claim carries evidence; logs go to the run directory and are referenced
by path, never pasted. Failures are attributed to a brief defect, an execution
defect, or an environment defect.

## How It Works

- pi-web loads profiles from `~/.pi/agent/agents/*.md` (**global**),
  `<cwd>/.agents/agents/*.md` (**workspace**), or `<cwd>/.pi/agents/*.md`
  (**project**); precedence: builtin < global < workspace < project.
- Each profile is a markdown file with YAML frontmatter: `tools` (allowlist:
  read/bash/edit/write/grep/find/ls), `load_skills`, `load_extensions`,
  `enabled`, `inherit_context`, `run_in_background`, optional `model`/
  `thinking`/`max_turns`, plus the system prompt as the body.
- The parent session delegates via the Agent tool with `subagent_type`.
- `load_skills`/`load_extensions`: subagents load the project's skill
  collection (e.g. the Rem skills and their private companion) and extension
  tools (MCP, e.g. Rider text search), as configured by the project's
  `skills` settings.

## Install

1. Enable pi-web built-in subagents: `~/.pi/agent/agents/settings.json` →
   `builtInEnabled: true`.
2. Link this repo's `agents/` into the project's **workspace** scope. Windows
   example (a junction needs no admin rights):

   ```powershell
   New-Item -ItemType Junction -Path "<cwd>\.agents\agents" -Target "<repo-path>\agents"
   ```

3. Optionally link the run directory as well, so the convention document and
the run artifacts share one path:

   ```powershell
   New-Item -ItemType Junction -Path "<cwd>\.agents\runs" -Target "<repo-path>\runs"
   ```

4. Restart or reload the pi-web session so the Agent tool picks up the new
   profiles.
5. Project-specific values (build paths, test prefix, plugin inventory) are
   **not** in this repo — they live in the project's private companion skills,
   which the profiles reference by name.

## Notes

- Profiles resolve only when the session `cwd` matches the project scope
  directory — pi-web does not walk ancestor directories for profile locations.
- No profile pins a model: every executor inherits the parent session's model
  unless the Agent call overrides `model`/`thinking`.
- `verify` and `git` default to `run_in_background: true`; the parent is
  notified with the final report when they finish.
- Under `runs/`, only the convention document and the templates are tracked;
  run artifacts (`<run-id>/brief.md`, `state.md`, `*.log`, `report.md`) are
  git-ignored and stay local.

## License

MIT
