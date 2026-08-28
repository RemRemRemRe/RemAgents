# RemAgents

pi-web subagent profiles for the Rem project — a small collection of
[pi-web](https://github.com/agegr/pi-web) built-in subagent profiles organized
by **workflow stage** (plan → author → review → verify → debug → git), so the
main session delegates each stage to a focused, skill-aware subagent.

> **中文版**: [README.zh-CN.md](README.zh-CN.md)

Both language versions are maintained in lockstep — the one-liners mirror each
profile's own `description`/`display_name`. When a profile changes, update
both files in the same change.

## What's Inside

| profile | display name | workflow stage | tools | focus |
|---|---|---|---|---|
| `grill` | Plan & Decision | planning / decision modeling | read-only | batch-grill-with-docs: explore, model decisions as a graph, return the frontier of questions |
| `author` | Code Authoring | code + test authoring | full | UE C++ authoring, BDD specs, TDD, refactoring, Rem-specific skills |
| `review` | Code Review | unified-style review | read-only | cpp best-practices checklist, layered BDD test-tree audit, test completeness, codebase audit |
| `verify` | Build & Test | compile + headless tests | full | commit-workflow verification gate: test-completeness check, build, headless test run |
| `debug` | Debugging | runtime root-cause | full | Rider live debugging, debugger-driven analysis |
| `git` | Git & Commit | submodule updates + commit | full | submodule sync/push, single-responsibility commits, history rewrite, build+test gate |
| `skill-authoring` | Skill Authoring | meta (maintaining skills) | full | skill writing, generalization, MCP server authoring, knowledge capture |

## How It Works

- pi-web loads profiles from `<cwd>/.pi/agents/*.md` (**project scope**) or
  `~/.pi/agent/agents/*.md` (**global scope**); precedence: builtin < global <
  workspace < project.
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
2. Link this repo's `agents/` into the project scope. Windows example
   (a junction needs no admin rights):

   ```powershell
   New-Item -ItemType Junction -Path "<cwd>\.pi\agents" -Target "<repo-path>\agents"
   ```

3. Restart or reload the pi-web session so the Agent tool picks up the new
   profiles.
4. Project-specific values (build paths, test prefix, plugin inventory) are
   **not** in this repo — they live in the project's private companion skills,
   which the profiles reference by name.

## Notes

- Profiles resolve only when the session `cwd` matches the project scope
  directory — pi-web does not walk ancestor directories for profile locations.
- The `grill` profile pins a model/thinking level as a suggestion; override
  per call via the Agent tool's `model`/`thinking` parameters.

## License

MIT
