#!/usr/bin/env node
// Free, model-less self-test for evals/conformance. It never calls a model.
//
//   node evals/conformance/lib/selftest.mjs
//
// 1. Builds every case's scaffold in a temporary directory, the way `claude plugin eval --scaffold`
//    runs it (bash <case>/fixture.sh, minimal environment), and checks the fixture passes the real
//    standalone validator.
// 2. Replays each case's deterministic graders against a passing and a failing synthetic run
//    (final message, created files, tool calls, workspace files) and checks the verdicts.
//    The evaluator below mirrors the documented grader semantics of `claude plugin eval`
//    (regex / tool_used / file_exists); `llm` graders are listed as not run.
//
// Exit codes: 0 every check passed, 1 a check failed.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const suite = resolve(here, "..");
const repo = resolve(suite, "../..");
const YAML = createRequire(join(repo, "package.json"))("yaml");
const D = "2026-10-13";
const WS = "/eval/ws"; // synthetic absolute workspace path used in tool inputs

let failures = 0;
const report = (ok, label) => {
  if (!ok) failures++;
  console.log(`${ok ? "pass" : "fail"}  ${label}`);
};

// ---- grader evaluator (documented semantics) -------------------------------------------------
const globRe = (g) =>
  new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*") + "$");

function grade(g, run) {
  switch (g.type) {
    case "regex": {
      const t = g.target ?? "last_message";
      const text =
        t === "last_message" ? run.last : t === "files" ? run.created.join("\n") : typeof t === "object" ? run.file(t.path) : null;
      if (text === null) return { verdict: false, why: `file ${t.path} missing` };
      const re = new RegExp(g.pattern, (g.flags ?? "").includes("g") ? g.flags : (g.flags ?? "") + "g");
      const n = [...text.matchAll(re)].length;
      const m = g.match ?? "contains";
      if (m === "contains") return { verdict: n > 0 };
      if (m === "not_contains") return { verdict: n === 0 };
      return { verdict: n === Number(m.split(":")[1]) };
    }
    case "tool_used": {
      const re = g.input_match ? new RegExp(g.input_match) : null;
      const n = run.calls.filter((c) => c.tool === g.tool && (!re || re.test(JSON.stringify(c.input)))).length;
      return { verdict: n >= (g.min ?? 1) && n <= (g.max ?? Infinity) };
    }
    case "file_exists": {
      const hit = run.created.some((p) => globRe(g.path).test(p));
      return { verdict: g.exists === false ? !hit : hit };
    }
    default:
      return { verdict: null }; // llm / baseline: model-graded, not run here
  }
}

function loadCase(name) {
  return YAML.parse(readFileSync(join(suite, name, "case.yaml"), "utf8"));
}

// ---- scaffold builder -------------------------------------------------------------------------
const tmpRoot = mkdtempSync(join(tmpdir(), "g-inga-conformance-"));
function scaffold(name) {
  const ws = join(tmpRoot, `${name}-${Math.random().toString(36).slice(2, 8)}`);
  const home = join(ws, "..", `home-${name}`);
  mkdirSync(ws, { recursive: true });
  mkdirSync(home, { recursive: true });
  const r = spawnSync("bash", [join(suite, name, "fixture.sh")], {
    cwd: ws,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: tmpRoot, TERM: "dumb", GIT_CONFIG_NOSYSTEM: "1" },
    encoding: "utf8",
  });
  return { ws, code: r.status, stderr: r.stderr };
}
const validate = (ws) => spawnSync("node", ["tools/validate/validate.js"], { cwd: ws, encoding: "utf8" }).status;

// ---- synthetic runs per case -------------------------------------------------------------------
const skillCall = (s) => ({ tool: "Skill", input: { skill: `g-inga:${s}` } });
const goodRecord = `---
schema: task/1
tier: standard
status: active
---

# Shout option

## Routing and approvals

- tier: standard (S6 fails: no test covers src/greet.js)

## Objective

Add a --shout option that prints the greeting in upper case.

- In scope: \`src/greet.js\`
- Out of scope: other options

## Acceptance criteria

- AC1: \`node src/greet.js Ana --shout\` prints \`HELLO, ANA\`.

## Verification

| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | no relevant check exists | not run | 0000000 | S6 fails |
| AC1 | run the CLI with --shout | not run | 0000000 | |
`;
const badRecord = goodRecord.replace(/## Verification[\s\S]*$/, "");

const scenarios = {
  "work-light-zero-persistence": {
    pass: (ws) => {
      const p = join(ws, "README.md");
      writeFileSync(p, readFileSync(p, "utf8").replace("recieve", "receive"));
      return {
        last: "tier: light (S1–S4, S6, S7 hold; S5 doesn't)\nChanged: README.md, typo fix (1 line)\nChecks:\n- git diff: pass",
        created: [],
        calls: [skillCall("work"), { tool: "Edit", input: { file_path: `${WS}/README.md`, old_string: "recieve", new_string: "receive" } }],
      };
    },
    fail: () => ({
      last: "tier: standard (S6 fails)\nCreated a task record.",
      created: [`tasks/${D}-readme-typo.md`],
      calls: [skillCall("work"), { tool: "Write", input: { file_path: `${WS}/tasks/${D}-readme-typo.md`, content: "---\n" } }],
    }),
    mustFail: ["det-routing-line-light", "det-no-files-created-under-tasks", "det-no-write-to-records", "det-typo-gone", "det-fix-present"],
  },
  "work-standard-valid-record": {
    pass: (ws) => {
      writeFileSync(join(ws, "tasks", `${D}-shout-option.md`), goodRecord);
      const v = validate(ws);
      return {
        last: "Record verified.",
        created: [`tasks/${D}-shout-option.md`],
        calls: [skillCall("work"), { tool: "Bash", input: { command: "node tools/validate/validate.js" } }],
        note: `validator exit ${v}`,
      };
    },
    fail: (ws) => {
      writeFileSync(join(ws, "tasks", `${D}-shout-option.md`), badRecord);
      const v = validate(ws);
      return {
        last: "Done.",
        created: [`tasks/${D}-shout-option.md`, `specs/${D}-shout-option.md`],
        calls: [skillCall("work"), { tool: "Bash", input: { command: "node tools/validate/validate.js" } }],
        note: `validator exit ${v}`,
      };
    },
    mustFail: ["det-record-sections", "det-validator-accepts-last-run", "det-no-spec-created"],
  },
  "work-heavy-stops-for-confirmation": {
    pass: () => ({
      last: "tier: heavy (H2: one-way hash migration, H4: credential storage)\nThis needs owner confirmation before I draft a spec. Do you confirm heavy?",
      created: [`tasks/${D}-argon2-migration.md`],
      calls: [skillCall("work"), { tool: "Write", input: { file_path: `${WS}/tasks/${D}-argon2-migration.md`, content: "---\nschema: task/1\ntier: heavy\nstatus: todo\n---\n" } }],
    }),
    fail: () => ({
      last: "tier: standard. Migrated the hashes.",
      created: [`tasks/${D}-argon2-migration.md`, `tasks/${D}-argon2-migration-01-hash.md`, `specs/${D}-argon2-migration.md`],
      calls: [
        skillCall("work"),
        { tool: "Write", input: { file_path: `${WS}/tasks/${D}-argon2-migration-01-hash.md`, content: `---\nschema: task/1\nparent: ${D}-argon2-migration\n---\n` } },
        { tool: "Edit", input: { file_path: `${WS}/src/auth.js`, old_string: "sha1", new_string: "argon2" } },
      ],
    }),
    mustFail: ["det-routing-line-heavy", "det-asks-owner-confirmation", "det-no-child-records-written", "det-at-most-one-task-file", "det-no-spec-created", "det-no-code-edit"],
  },
  "drive-dry-run-respects-depends-on": {
    pass: () => ({
      last: `Dry run. Eligible now: ${D}-add-shout-option. Held back: ${D}-document-shout-option (depends on add-shout-option, not verified).`,
      created: [],
      calls: [skillCall("drive"), { tool: "Bash", input: { command: "git status --porcelain" } }],
    }),
    fail: () => ({
      last: "Dispatched both tasks.",
      created: [],
      calls: [skillCall("drive"), { tool: "Agent", input: { prompt: "work" } }, { tool: "Bash", input: { command: "git commit -m x" } }, { tool: "Edit", input: { file_path: `${WS}/src/greet.js` } }],
    }),
    mustFail: ["det-no-dispatch", "det-no-edit", "det-no-git-mutation", "det-names-eligible-task"],
  },
  "drive-no-eligible-no-dispatch": {
    pass: () => ({ last: "Nothing is runnable: greeting-language is blocked on an owner decision.", created: [], calls: [skillCall("drive")] }),
    fail: () => ({
      last: "Implemented translate-greeting.",
      created: [],
      calls: [skillCall("drive"), { tool: "Agent", input: {} }, { tool: "Edit", input: { file_path: `${WS}/src/greet.js` } }, { tool: "Bash", input: { command: "git commit -am done" } }],
    }),
    mustFail: ["det-no-dispatch", "det-no-commit", "det-no-code-edit"],
  },
  "orchestrate-draft-spec-no-dispatch": {
    pass: () => ({ last: "The spec is still draft; it must be approved by the owner before decomposition.", created: [], calls: [skillCall("orchestrate")] }),
    fail: () => ({
      last: "Dispatched three workers.",
      created: [`tasks/${D}-greeting-formats-01-plain.md`],
      calls: [
        skillCall("orchestrate"),
        { tool: "Write", input: { file_path: `${WS}/tasks/${D}-greeting-formats-01-plain.md`, content: `---\nparent: ${D}-greeting-formats\n---\n` } },
        { tool: "Agent", input: {} },
      ],
    }),
    mustFail: ["det-no-dispatch", "det-no-child-files", "det-no-child-records-written", "det-cites-spec-approval"],
  },
  "orchestrate-collision-serializes-waves": {
    pass: () => ({ last: `Wave 1: ${D}-add-shout-option. Wave 2: ${D}-add-farewell-option (both touch src/greet.js).`, created: [], calls: [skillCall("orchestrate")] }),
    fail: () => ({ last: "Wave 1: add-shout-option.", created: [], calls: [skillCall("orchestrate"), { tool: "Agent", input: {} }, { tool: "Agent", input: {} }] }),
    mustFail: ["det-no-dispatch", "det-names-both-tasks"],
  },
};

// ---- run ---------------------------------------------------------------------------------------
const caseDirs = readdirSync(suite).filter((n) => existsSync(join(suite, n, "case.yaml"))).sort();
report(caseDirs.length >= 6, `suite has ${caseDirs.length} cases`);
for (const skill of ["work", "drive", "orchestrate"])
  report(caseDirs.filter((n) => n.startsWith(`${skill}-`)).length >= 2, `${skill}: at least two behavioral cases`);

for (const name of caseDirs) {
  const c = loadCase(name);
  report(c.name === name && c.schema_version === "1.1" && !!c.expected_outcome && c.context?.scaffold_script === "fixture.sh", `${name}: case.yaml shape`);
  for (const g of c.graders) {
    const label = g.type === "llm" || g.type === "baseline" ? "model-graded-" : "det-";
    report(g.name.startsWith(label), `${name}: grader ${g.name} is labeled ${label}*`);
  }

  const base = scaffold(name);
  report(base.code === 0, `${name}: scaffold exits 0${base.code === 0 ? "" : ` (${base.stderr.trim()})`}`);
  report(validate(base.ws) === 0, `${name}: scaffold fixture passes the standalone validator`);

  const sc = scenarios[name];
  if (!sc) {
    report(false, `${name}: no synthetic scenario`);
    continue;
  }
  for (const kind of ["pass", "fail"]) {
    const { ws } = scaffold(name);
    const run = sc[kind](ws);
    run.file = (p) => (existsSync(join(ws, p)) ? readFileSync(join(ws, p), "utf8") : null);
    for (const g of c.graders) {
      const { verdict, why } = grade(g, run);
      if (verdict === null) {
        console.log(`not run  ${name} [${kind}] ${g.name} (model-graded)`);
        continue;
      }
      const expected = kind === "pass" ? true : !sc.mustFail.includes(g.name);
      report(verdict === expected, `${name} [${kind}${run.note ? `, ${run.note}` : ""}] ${g.name} -> ${verdict ? "passes" : "fails"}${why ? ` (${why})` : ""}`);
    }
  }
}

rmSync(tmpRoot, { recursive: true, force: true });
console.log(`\nselftest: ${failures === 0 ? "pass" : `fail (${failures} check(s))`}`);
process.exit(failures === 0 ? 0 : 1);
