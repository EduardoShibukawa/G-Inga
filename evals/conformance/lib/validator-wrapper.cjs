#!/usr/bin/env node
// Eval fixture shim, installed by lib/fixture.sh as tools/validate/validate.js inside a scaffold
// workspace. It runs the real G-Ingá standalone validator (copied next to it as validate.real.mjs)
// unchanged, then appends the exit code to .eval/validator-runs.log so a deterministic regex
// grader can read the result of the agent's last validator run. Output and exit code are passed through.
"use strict";
const { spawnSync } = require("node:child_process");
const { appendFileSync, mkdirSync } = require("node:fs");
const { join, resolve } = require("node:path");

const args = process.argv.slice(2);
const i = args.indexOf("--root");
const root = resolve(i >= 0 && args[i + 1] ? args[i + 1] : process.cwd());
const real = join(__dirname, "validate.real.mjs");
const r = spawnSync(process.execPath, [real, ...args], { stdio: "inherit" });
const code = r.status === null ? 2 : r.status;
try {
  mkdirSync(join(root, ".eval"), { recursive: true });
  appendFileSync(join(root, ".eval", "validator-runs.log"), `validator-exit=${code}\n`);
} catch {
  // Logging must never change the validator's verdict.
}
process.exit(code);
