#!/usr/bin/env node
// Validate this repository's subagent profiles with pi-web's real parser.
//
//   node tools/validate-profiles.mjs [--pi-web <path>] [--cwd <path>]
//
// Machine-specific paths are resolved in this order (first match wins):
//   --pi-web / --cwd  >  tools/validate.local.json  >  PI_WEB_ROOT / PROJECT_CWD
// Copy tools/validate.local.example.json to tools/validate.local.json once per
// clone; it is git-ignored because it holds machine paths.
//
// Exit codes: 0 = clean, 1 = problems found, 2 = cannot validate (pi-web or the
// project root could not be resolved). A git hook should treat 2 as "skip".
//
// The checks encode this repository's own conventions (they are documented in
// README.md and runs/README.md), so the script is generic except for the two
// paths above.
import { createRequire } from "module";
import { existsSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { execFileSync } from "child_process";

/** Longest acceptable system prompt; the report contract caps the *report*, this caps the brief side. */
const MAX_PROMPT_CHARS = 3000;
/** Every report skeleton must name where its evidence comes from. */
const REQUIRED_REPORT_FIELD = /^EVIDENCE(?:_CHAIN)?:/m;
/** Files allowed to be tracked under runs/ (the convention document and templates). */
const RUNS_ALLOWLIST = new Set([
  ".gitignore",
  "README.md",
  "_template/brief.md",
  "_template/report.md",
  "_template/state.md",
]);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--pi-web") out.piWebRoot = argv[++i];
    else if (argv[i] === "--cwd") out.projectCwd = argv[++i];
    else if (!out.projectCwd) out.projectCwd = argv[i];
  }
  return out;
}

function readLocalConfig() {
  const file = join(repoRoot, "tools", "validate.local.json");
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`cannot parse tools/validate.local.json: ${error.message}`);
    return {};
  }
}

function unavailable(message) {
  console.error(`validate-profiles: ${message}`);
  console.error("Copy tools/validate.local.example.json to tools/validate.local.json and fill it in,");
  console.error("or pass --pi-web/--cwd, or set PI_WEB_ROOT/PROJECT_CWD.");
  process.exitCode = 2;
}

const args = parseArgs(process.argv.slice(2));
const local = readLocalConfig();
const piWebRoot = args.piWebRoot ?? local.piWebRoot ?? process.env.PI_WEB_ROOT;
const projectCwd = args.projectCwd ?? local.projectCwd ?? process.env.PROJECT_CWD;

if (!piWebRoot) unavailable("no pi-web root configured.");
else if (!existsSync(join(piWebRoot, "package.json"))) unavailable(`pi-web root has no package.json: ${piWebRoot}`);
if (process.exitCode === 2) process.exit();
if (!projectCwd) unavailable("no project cwd configured.");
else if (!existsSync(projectCwd)) unavailable(`project cwd does not exist: ${projectCwd}`);
if (process.exitCode === 2) process.exit();

const require = createRequire(pathToFileURL(join(piWebRoot, "package.json")));
let createJiti;
try {
  ({ createJiti } = require("jiti"));
} catch {
  unavailable(`jiti is not installed in the pi-web root: ${piWebRoot}`);
  process.exit();
}

const jiti = createJiti(pathToFileURL(join(repoRoot, "tools", "validate-profiles.mjs")).href, { interopDefault: true });
let listSubagentProfiles;
let resolveSubagentProfile;
try {
  ({ listSubagentProfiles, resolveSubagentProfile } = await jiti.import(
    join(piWebRoot, "lib", "subagents.ts"),
  ));
} catch (error) {
  unavailable(`cannot load pi-web's profile parser: ${error.message}`);
  process.exit();
}

const profiles = listSubagentProfiles(projectCwd);
console.log(`=== profiles resolved at cwd ${projectCwd} (${profiles.length}) ===`);
for (const profile of profiles) {
  const flags = [
    `tools: ${profile.tools.join(",") || "none"}`,
    `skills:${profile.loadSkills}`,
    `ext:${profile.loadExtensions}`,
    `inherit:${profile.inheritContext}`,
    `bg:${profile.runInBackground}`,
    `enabled:${profile.enabled}`,
    ...(profile.model ? [`model:${profile.model}`] : []),
    ...(profile.thinking ? [`thinking:${profile.thinking}`] : []),
    ...(profile.maxTurns ? [`maxTurns:${profile.maxTurns}`] : []),
  ].join(" | ");
  console.log(`- ${profile.name} [${profile.scope}] "${profile.displayName}" | ${flags}`);
}

const problems = [];
for (const profile of profiles) {
  if (profile.scope === "builtin") continue;
  // A description equal to the file name means frontmatter parsing failed and
  // the parser silently fell back to defaults (e.g. an unquoted ": " in YAML).
  if (profile.description === profile.name) {
    problems.push(`${profile.name}: description fell back to name (frontmatter parse failure?)`);
  }
  if (!profile.systemPrompt.trim()) problems.push(`${profile.name}: empty system prompt`);
  if (profile.systemPrompt.length > MAX_PROMPT_CHARS) {
    problems.push(`${profile.name}: system prompt is ${profile.systemPrompt.length} chars (>${MAX_PROMPT_CHARS})`);
  }
  if (!REQUIRED_REPORT_FIELD.test(profile.systemPrompt)) {
    problems.push(`${profile.name}: report skeleton has no EVIDENCE field`);
  }
}

console.log("\n=== custom profiles resolve by name ===");
for (const profile of profiles.filter((item) => item.scope !== "builtin")) {
  const resolved = resolveSubagentProfile(projectCwd, profile.name);
  console.log(`${profile.name} -> ${resolved ? `OK (${resolved.scope})` : "MISSING/disabled"}`);
}

// Guard: run artifacts must never be tracked (runs/ holds local working state).
// Only applies when this repository actually uses the run-directory convention.
if (existsSync(join(repoRoot, "runs"))) {
  let trackedUnderRuns = [];
  try {
    trackedUnderRuns = execFileSync("git", ["-C", repoRoot, "ls-files", "runs"], { encoding: "utf8" })
      .split("\n").filter(Boolean).map((file) => file.replace(/^runs\//, ""));
  } catch {
    trackedUnderRuns = [];
  }
  for (const file of trackedUnderRuns) {
    if (!RUNS_ALLOWLIST.has(file)) problems.push(`runs/${file} is tracked but run artifacts must stay ignored`);
  }
  try {
    execFileSync("git", ["-C", repoRoot, "check-ignore", "-q", "runs/00000000-0000-probe/report.md"]);
  } catch {
    problems.push("runs/<run-id>/ artifacts are not git-ignored (leak risk)");
  }
}

if (problems.length > 0) {
  console.log(`\n=== problems (${problems.length}) ===`);
  for (const problem of problems) console.log(`! ${problem}`);
  process.exitCode = 1;
} else {
  console.log("\nOK: no frontmatter/scope problems detected.");
}
