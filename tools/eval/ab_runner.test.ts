/**
 * tools/eval/ab_runner.test.ts
 *
 * Unit tests for multi-host A/B benchmark runner and scaffold contamination guardrail.
 * Verifies AC1 through AC5 of child task 04:
 * - Contamination assertion and detection of skill presence (.claude/skills and .agents/skills).
 * - Iteration harness execution across 'with' and 'without' conditions.
 * - Deterministic quality score derivation.
 * - CLI argument parsing and dry-run mode.
 * - TSV ledger append and 18-column ADR 0006 schema alignment.
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  checkScaffoldContamination,
  assertNoContamination,
  assertNoHarnessSkills,
  stripSkills,
  stripHarnessSkills,
  prepareIsolatedWorktree,
  getHostDisableFlags,
  calculateQualityScore,
  parseCliArgs,
  executeAbBenchmark,
} from "./ab_runner";
import { TSV_HEADER } from "./aggregate_usage";

describe("Contamination Guardrail (AC2)", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "g-inga-guard-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("passes assertion on clean directory without skills", () => {
    expect(checkScaffoldContamination(tmpDir)).toBe(false);
    expect(() => assertNoContamination(tmpDir)).not.toThrow();
  });

  test("detects contamination when .claude/skills exists", async () => {
    const claudeSkills = path.join(tmpDir, ".claude", "skills", "my-skill");
    await fs.mkdir(claudeSkills, { recursive: true });
    await fs.writeFile(path.join(claudeSkills, "SKILL.md"), "# Skill");

    expect(checkScaffoldContamination(tmpDir)).toBe(true);
    expect(() => assertNoContamination(tmpDir)).toThrow(/Scaffold contamination detected/);
    expect(() => assertNoContamination(tmpDir)).toThrow(/\.claude\/skills/);
  });

  test("detects contamination when .agents/skills exists", async () => {
    const agentSkills = path.join(tmpDir, ".agents", "skills", "drive");
    await fs.mkdir(agentSkills, { recursive: true });
    await fs.writeFile(path.join(agentSkills, "SKILL.md"), "# Drive");

    expect(checkScaffoldContamination(tmpDir)).toBe(true);
    expect(() => assertNoContamination(tmpDir)).toThrow(/Scaffold contamination detected/);
    expect(() => assertNoContamination(tmpDir)).toThrow(/\.agents\/skills/);
  });

  test("detects contamination when both skill directories are present", async () => {
    await fs.mkdir(path.join(tmpDir, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tmpDir, ".agents", "skills"), { recursive: true });

    expect(checkScaffoldContamination(tmpDir)).toBe(true);
    expect(() => assertNoContamination(tmpDir)).toThrow(/Scaffold contamination detected/);
  });

  test("detects contamination when root skills/ exists", async () => {
    const rootSkills = path.join(tmpDir, "skills", "work");
    await fs.mkdir(rootSkills, { recursive: true });
    await fs.writeFile(path.join(rootSkills, "SKILL.md"), "# Work");

    expect(checkScaffoldContamination(tmpDir)).toBe(true);
    expect(() => assertNoContamination(tmpDir)).toThrow(/Scaffold contamination detected/);
    expect(() => assertNoContamination(tmpDir)).toThrow(/skills/);
    expect(() => assertNoHarnessSkills(tmpDir)).toThrow(/Scaffold contamination detected/);
  });

  test("stripSkills cleans all skill directories including skills/ and makes directory pass assertion", async () => {
    const rootSkillDir = path.join(tmpDir, "skills", "work");
    const claudeSkillDir = path.join(tmpDir, ".claude", "skills", "test-skill");
    const agentSkillDir = path.join(tmpDir, ".agents", "skills", "test-agent-skill");
    await fs.mkdir(rootSkillDir, { recursive: true });
    await fs.mkdir(claudeSkillDir, { recursive: true });
    await fs.mkdir(agentSkillDir, { recursive: true });

    expect(checkScaffoldContamination(tmpDir)).toBe(true);

    stripHarnessSkills(tmpDir);

    expect(checkScaffoldContamination(tmpDir)).toBe(false);
    expect(() => assertNoHarnessSkills(tmpDir)).not.toThrow();
  });

  test("prepareIsolatedWorktree strips skills and validates clean environment", async () => {
    await fs.mkdir(path.join(tmpDir, ".agents", "skills", "work"), { recursive: true });
    expect(checkScaffoldContamination(tmpDir)).toBe(true);

    prepareIsolatedWorktree(tmpDir);

    expect(checkScaffoldContamination(tmpDir)).toBe(false);
    expect(() => assertNoContamination(tmpDir)).not.toThrow();
  });
});

describe("Deterministic quality_score derivation (AC3)", () => {
  test("returns 1.0 when all checks pass", () => {
    expect(calculateQualityScore({ totalChecks: 5, passedChecks: 5 })).toBe(1.0);
    expect(calculateQualityScore({ testExitCode: 0 })).toBe(1.0);
    expect(
      calculateQualityScore({
        checks: [
          { name: "build", passed: true },
          { name: "test", passed: true },
        ],
      })
    ).toBe(1.0);
  });

  test("returns proportional score for partial check pass", () => {
    // 3 of 4 checks passed = 0.75
    expect(calculateQualityScore({ totalChecks: 4, passedChecks: 3 })).toBe(0.75);
    // 1 of 2 checks passed = 0.50
    expect(
      calculateQualityScore({
        checks: [
          { name: "lint", passed: true },
          { name: "e2e", passed: false },
        ],
      })
    ).toBe(0.5);
    // 1 of 3 = 0.33
    expect(calculateQualityScore({ totalChecks: 3, passedChecks: 1 })).toBe(0.33);
  });

  test("returns 0.0 for build or compile failure", () => {
    expect(
      calculateQualityScore({
        buildExitCode: 1,
        totalChecks: 10,
        passedChecks: 10,
      })
    ).toBe(0.0);
  });

  test("returns 0.0 for fatal test failure with no checks reported", () => {
    expect(calculateQualityScore({ testExitCode: 1 })).toBe(0.0);
    expect(calculateQualityScore({ testExitCode: 2 })).toBe(0.0);
  });

  test("clamps numeric scores in range [0.0, 1.0]", () => {
    expect(calculateQualityScore(0.854)).toBe(0.85);
    expect(calculateQualityScore(1.5)).toBe(1.0);
    expect(calculateQualityScore(-0.5)).toBe(0.0);
  });
});

describe("Host disable flags", () => {
  test("returns --disable-slash-commands for claude-code", () => {
    const flags = getHostDisableFlags("claude-code");
    expect(flags).toContain("--disable-slash-commands");
  });

  test("returns host disable flags for antigravity and opencode", () => {
    expect(getHostDisableFlags("antigravity")).toContain("--disable-custom-skills");
    expect(getHostDisableFlags("opencode")).toContain("--no-skills");
  });
});

describe("CLI options parsing (AC1)", () => {
  test("parses defaults cleanly", () => {
    const opts = parseCliArgs([]);
    expect(opts.iterations).toBe(3);
    expect(opts.host).toBe("claude-code");
    expect(opts.maxCostUsd).toBe(5.0);
    expect(opts.dryRun).toBe(false);
    expect(opts.outDir).toBe("records/usage");
    expect(opts.ledgerPath).toBe("records/usage-ledger.tsv");
    expect(opts.summaryPath).toBe("records/usage-summary.md");
  });

  test("parses explicit flags correctly", () => {
    const args = [
      "--task-id",
      "test-task-123",
      "--iterations",
      "5",
      "--host",
      "opencode",
      "--max-cost-usd",
      "3.50",
      "--dry-run",
      "--out",
      "tmp/usage",
      "--ledger",
      "tmp/ledger.tsv",
      "--summary",
      "tmp/summary.md",
    ];
    const opts = parseCliArgs(args);
    expect(opts.taskId).toBe("test-task-123");
    expect(opts.iterations).toBe(5);
    expect(opts.host).toBe("opencode");
    expect(opts.maxCostUsd).toBe(3.5);
    expect(opts.dryRun).toBe(true);
    expect(opts.outDir).toBe("tmp/usage");
    expect(opts.ledgerPath).toBe("tmp/ledger.tsv");
    expect(opts.summaryPath).toBe("tmp/summary.md");
  });

  test("supports -n and --budget aliases", () => {
    const opts = parseCliArgs(["-n", "4", "--budget", "2.25"]);
    expect(opts.iterations).toBe(4);
    expect(opts.maxCostUsd).toBe(2.25);
  });
});

describe("A/B benchmark runner execution and TSV ledger append (AC1, AC3, AC5)", () => {
  let tmpDir: string;
  let outDir: string;
  let ledgerPath: string;
  let summaryPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "g-inga-ab-test-"));
    outDir = path.join(tmpDir, "records", "usage");
    ledgerPath = path.join(tmpDir, "records", "usage-ledger.tsv");
    summaryPath = path.join(tmpDir, "records", "usage-summary.md");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("executes N iterations across with and without conditions in dry-run mode", async () => {
    const result = await executeAbBenchmark({
      taskId: "test-benchmark-task",
      iterations: 2,
      dryRun: true,
      outDir,
      ledgerPath,
      summaryPath,
    });

    expect(result.iterations).toBe(2);
    expect(result.dryRun).toBe(true);
    // 2 iterations * 2 arms = 4 total runs
    expect(result.runs.length).toBe(4);

    const withRuns = result.runs.filter((r) => r.condition === "with");
    const withoutRuns = result.runs.filter((r) => r.condition === "without");
    expect(withRuns.length).toBe(2);
    expect(withoutRuns.length).toBe(2);

    // Verify trace files written to outDir
    const files = await fs.readdir(outDir);
    expect(files.filter((f) => f.endsWith(".jsonl")).length).toBe(4);

    // Verify markdown summary generated
    const summaryExists = await fs
      .stat(summaryPath)
      .then(() => true)
      .catch(() => false);
    expect(summaryExists).toBe(true);

    const summaryContent = await fs.readFile(summaryPath, "utf8");
    expect(summaryContent).toContain("# Continuous Usage Telemetry Summary");
    expect(summaryContent).toContain("## Condition Comparison (with vs without)");
    expect(summaryContent).toContain("test-benchmark-task");
  });

  test("appends records adhering strictly to 18-column TSV schema", async () => {
    await executeAbBenchmark({
      taskId: "schema-validation-task",
      iterations: 2,
      dryRun: true,
      outDir,
      ledgerPath,
      summaryPath,
    });

    const ledgerContent = await fs.readFile(ledgerPath, "utf8");
    const lines = ledgerContent.trim().split("\n");

    // Header line + 4 run lines
    expect(lines.length).toBe(5);
    expect(lines[0]).toBe(TSV_HEADER);

    const expectedHeaderCols = TSV_HEADER.split("\t");
    expect(expectedHeaderCols.length).toBe(18);

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split("\t");
      expect(cols.length).toBe(18);

      const [
        timestamp,
        runId,
        taskId,
        epicId,
        host,
        model,
        condition,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        totalTokens,
        cacheRatio,
        costUsd,
        durationS,
        qualityScore,
        state,
        note,
      ] = cols;

      expect(taskId).toBe("schema-validation-task");
      expect(["with", "without"]).toContain(condition);
      expect(Number(totalTokens)).toBeGreaterThan(0);
      expect(Number(costUsd)).toBeGreaterThan(0);
      expect(Number(qualityScore)).toBeGreaterThanOrEqual(0);
      expect(Number(qualityScore)).toBeLessThanOrEqual(1.0);
      expect(["observed", "derived", "estimated", "absent", "unsupported"]).toContain(state);
    }
  });

  test("halts iterations when budget ceiling is exceeded", async () => {
    // Very low budget ($0.05) should halt after first 1 or 2 runs
    const result = await executeAbBenchmark({
      taskId: "budget-constrained-task",
      iterations: 5,
      maxCostUsd: 0.05,
      dryRun: true,
      outDir,
      ledgerPath,
      summaryPath,
    });

    expect(result.runs.length).toBeLessThan(10);
  });
});
