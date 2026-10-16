import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import {
  aggregateUsage,
  calculateCacheRatio,
  formatMarkdownSummary,
  formatLedgerRows,
  appendLedger,
  parseJsonlRecords,
  loadRecordsFromPath,
  parseCliArgs,
  TSV_HEADER,
  type RawRecordInput,
} from "./aggregate_usage";

describe("Cache hit ratio calculation", () => {
  test("calculates standard ratio accurately", () => {
    // 500 cache_read / (1500 input + 500 cache_read) = 500 / 2000 = 0.25 (25%)
    expect(calculateCacheRatio(500, 1500)).toBeCloseTo(0.25, 4);
  });

  test("returns 0 when denominator is zero without throwing NaN", () => {
    expect(calculateCacheRatio(0, 0)).toBe(0);
  });

  test("handles 100% and 0% edge cases", () => {
    expect(calculateCacheRatio(1000, 0)).toBe(1.0);
    expect(calculateCacheRatio(0, 1000)).toBe(0.0);
  });
});

describe("Usage aggregation and grouping", () => {
  test("groups multi-step observations of the same run and accumulates tokens", () => {
    const rawEvents: RawRecordInput[] = [
      {
        run_id: "run-abc",
        task_id: "task-01",
        epic_id: "epic-x",
        host: "antigravity",
        model: "gemini-2.5-flash",
        condition: "with",
        input_tokens: { value: 1000, state: "observed" },
        output_tokens: { value: 200, state: "observed" },
        cache_read_tokens: { value: 300, state: "observed" },
        cache_write_tokens: { value: 0, state: "unsupported" },
        wall_duration_seconds: { value: 5.5, state: "observed" },
        cost_usd_estimate: { state: "unsupported" },
      },
      {
        run_id: "run-abc",
        task_id: "task-01",
        epic_id: "epic-x",
        host: "antigravity",
        model: "gemini-2.5-flash",
        condition: "with",
        input_tokens: { value: 500, state: "observed" },
        output_tokens: { value: 100, state: "observed" },
        cache_read_tokens: { value: 200, state: "observed" },
        cache_write_tokens: { value: 0, state: "unsupported" },
        wall_duration_seconds: { value: 4.5, state: "observed" },
        cost_usd_estimate: { state: "unsupported" },
      },
    ];

    const result = aggregateUsage(rawEvents);

    expect(result.total_runs).toBe(1);
    expect(result.total_observations).toBe(2);

    const run = result.runs[0];
    expect(run.run_id).toBe("run-abc");
    expect(run.task_id).toBe("task-01");
    expect(run.epic_id).toBe("epic-x");
    expect(run.host).toBe("antigravity");
    expect(run.condition).toBe("with");
    expect(run.input_tokens).toBe(1500);
    expect(run.output_tokens).toBe(300);
    expect(run.cache_read_tokens).toBe(500);
    expect(run.duration_s).toBe(10.0);
    // Total tokens: 1500 + 300 + 500 = 2300
    expect(run.total_tokens).toBe(2300);
    // Cache ratio: 500 / (1500 + 500) = 0.25
    expect(run.cache_ratio).toBeCloseTo(0.25, 4);
    expect(run.states.cost).toBe("unsupported");
  });

  test("separates runs across conditions and computes A/B delta savings", () => {
    const rawEvents: RawRecordInput[] = [
      // With arm
      {
        run_id: "run-with",
        task_id: "task-bench",
        epic_id: "epic-ab",
        host: "claude-code",
        condition: "with",
        input_tokens: 1000,
        output_tokens: 200,
        cache_read_tokens: 800,
        cache_write_tokens: 100,
        duration_s: 10,
        cost_usd: 0.05,
      },
      // Without arm (higher token usage, lower cache hit)
      {
        run_id: "run-without",
        task_id: "task-bench",
        epic_id: "epic-ab",
        host: "claude-code",
        condition: "without",
        input_tokens: 2500,
        output_tokens: 500,
        cache_read_tokens: 200,
        cache_write_tokens: 100,
        duration_s: 20,
        cost_usd: 0.12,
      },
    ];

    const result = aggregateUsage(rawEvents);

    expect(result.total_runs).toBe(2);
    expect(result.by_condition.with).toBeDefined();
    expect(result.by_condition.without).toBeDefined();

    const withCond = result.by_condition.with!;
    const withoutCond = result.by_condition.without!;

    expect(withCond.total_tokens).toBe(2100); // 1000 + 200 + 800 + 100
    expect(withoutCond.total_tokens).toBe(3300); // 2500 + 500 + 200 + 100

    expect(withCond.cache_ratio).toBeCloseTo(800 / 1800, 4);
    expect(withoutCond.cache_ratio).toBeCloseTo(200 / 2700, 4);

    const delta = result.by_condition.delta!;
    expect(delta).toBeDefined();
    // Delta: with - without = 2100 - 3300 = -1200
    expect(delta.token_delta).toBe(-1200);
    // Savings: (3300 - 2100) / 3300 = 36.36%
    expect(delta.token_savings_pct).toBeCloseTo(36.36, 1);
    expect(delta.cost_delta).toBeCloseTo(0.05 - 0.12, 4);
  });
});

describe("Markdown comparison table generation", () => {
  test("generates cleanly formatted Markdown tables with condition comparison and breakdowns", () => {
    const rawEvents: RawRecordInput[] = [
      {
        run_id: "run-01",
        task_id: "task-a",
        epic_id: "epic-1",
        host: "antigravity",
        condition: "with",
        input_tokens: 1200,
        output_tokens: 300,
        cache_read_tokens: 400,
        cost_usd: 0.04,
        duration_s: 15,
        quality_score: 1.0,
      },
      {
        run_id: "run-02",
        task_id: "task-a",
        epic_id: "epic-1",
        host: "antigravity",
        condition: "without",
        input_tokens: 2000,
        output_tokens: 500,
        cache_read_tokens: 100,
        cost_usd: 0.08,
        duration_s: 25,
        quality_score: 0.8,
      },
    ];

    const result = aggregateUsage(rawEvents);
    const md = formatMarkdownSummary(result);

    expect(md).toContain("# Continuous Usage Telemetry Summary");
    expect(md).toContain("## Condition Comparison (with vs without)");
    expect(md).toContain("| `with` | 1 |");
    expect(md).toContain("| `without` | 1 |");
    expect(md).toContain("| **Delta** |");
    expect(md).toContain("## Task Breakdown");
    expect(md).toContain("`task-a`");
    expect(md).toContain("## Host Distribution");
    expect(md).toContain("`antigravity`");
    expect(md).toContain("## Aggregated Run Details");
    expect(md).toContain("`run-01`");
    expect(md).toContain("`run-02`");
  });
});

describe("JSON summary structure", () => {
  test("contains all required summary, rollup, and dimensional keys", () => {
    const rawEvents: RawRecordInput[] = [
      {
        run_id: "run-j1",
        task_id: "task-json",
        epic_id: "epic-json",
        host: "opencode",
        condition: "with",
        input_tokens: 500,
        output_tokens: 150,
        cache_read_tokens: 250,
        duration_s: 8.5,
        cost_usd: 0.02,
      },
    ];

    const result = aggregateUsage(rawEvents);

    expect(result.generated_at).toBeDefined();
    expect(result.total_runs).toBe(1);
    expect(result.total_observations).toBe(1);

    expect(result.totals).toHaveProperty("total_tokens");
    expect(result.totals).toHaveProperty("cache_ratio");
    expect(result.totals).toHaveProperty("cost_usd");
    expect(result.totals).toHaveProperty("duration_s");

    expect(result.by_condition).toHaveProperty("with");
    expect(result.by_task).toHaveProperty("task-json");
    expect(result.by_host).toHaveProperty("opencode");
    expect(result.by_epic).toHaveProperty("epic-json");
    expect(result.runs.length).toBe(1);
    expect(result.runs[0].run_id).toBe("run-j1");
  });
});

describe("TSV ledger record append and alignment", () => {
  let tmpDir: string;
  let ledgerFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ledger-test-"));
    ledgerFile = path.join(tmpDir, "usage-ledger.tsv");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("creates header when ledger file is new and aligns 18 columns", async () => {
    const rawEvents: RawRecordInput[] = [
      {
        run_id: "run-tsv-1",
        task_id: "task-tsv",
        epic_id: "epic-tsv",
        host: "antigravity",
        model: "gemini-2.5-flash",
        condition: "with",
        input_tokens: { value: 1000, state: "observed" },
        output_tokens: { value: 200, state: "observed" },
        cache_read_tokens: { value: 500, state: "observed" },
        cache_write_tokens: { state: "unsupported" },
        wall_duration_seconds: { value: 12.4, state: "observed" },
        cost_usd_estimate: { state: "unsupported" },
        quality_score: 1.0,
        note: "verified pass",
      },
    ];

    const result = aggregateUsage(rawEvents);
    await appendLedger(ledgerFile, result);

    const content = await fs.readFile(ledgerFile, "utf8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(2); // Header + 1 record

    const headerCols = lines[0].split("\t");
    const rowCols = lines[1].split("\t");

    expect(headerCols.length).toBe(18);
    expect(rowCols.length).toBe(18);
    expect(lines[0]).toBe(TSV_HEADER);

    // Verify ADR 0006 honest reporting taxonomy
    expect(rowCols[1]).toBe("run-tsv-1"); // run_id
    expect(rowCols[2]).toBe("task-tsv"); // task_id
    expect(rowCols[3]).toBe("epic-tsv"); // epic_id
    expect(rowCols[4]).toBe("antigravity"); // host
    expect(rowCols[5]).toBe("gemini-2.5-flash"); // model
    expect(rowCols[6]).toBe("with"); // condition
    expect(rowCols[7]).toBe("1000"); // input_tokens
    expect(rowCols[8]).toBe("200"); // output_tokens
    expect(rowCols[9]).toBe("500"); // cache_read_tokens
    expect(rowCols[10]).toBe("unsupported"); // cache_write_tokens
    expect(rowCols[11]).toBe("1700"); // total_tokens
    expect(Number(rowCols[12])).toBeCloseTo(500 / 1500, 4); // cache_ratio
    expect(rowCols[13]).toBe("unsupported"); // cost_usd
    expect(rowCols[14]).toBe("12.4"); // duration_s
    expect(rowCols[15]).toBe("1.00"); // quality_score
    expect(rowCols[16]).toBe("observed"); // state
    expect(rowCols[17]).toBe("verified pass"); // note
  });

  test("appends rows without duplicating header if file already exists", async () => {
    // Write header first
    await fs.writeFile(ledgerFile, TSV_HEADER + "\n", "utf8");

    const rawEvents: RawRecordInput[] = [
      {
        run_id: "run-tsv-2",
        task_id: "task-tsv-2",
        epic_id: "epic-tsv",
        host: "claude-code",
        condition: "without",
        input_tokens: 3000,
        output_tokens: 400,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        duration_s: 18.0,
        cost_usd: 0.08,
      },
    ];

    const result = aggregateUsage(rawEvents);
    await appendLedger(ledgerFile, result);

    const content = await fs.readFile(ledgerFile, "utf8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(2); // Header + 1 record
    expect(lines[0]).toBe(TSV_HEADER);
    expect(lines[1]).toContain("run-tsv-2");
  });
});

describe(".gitignore verification for telemetry traces", () => {
  test("git ignores raw jsonl traces in records/usage/ while tracking ledger and summary", () => {
    const gitCheck = spawnSync("git", [
      "check-ignore",
      "records/usage/sample.jsonl",
      "records/usage/sub/sample.jsonl",
      "records/usage-summary.md",
      "records/usage-ledger.tsv",
    ]);

    const stdout = gitCheck.stdout.toString("utf8").trim().split("\n");
    expect(stdout).toContain("records/usage/sample.jsonl");
    expect(stdout).toContain("records/usage/sub/sample.jsonl");
    expect(stdout).not.toContain("records/usage-summary.md");
    expect(stdout).not.toContain("records/usage-ledger.tsv");
  });
});

describe("File loading and CLI parsing", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "aggregator-cli-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("loads and aggregates records from multiple .jsonl files in a directory", async () => {
    const file1 = path.join(tmpDir, "trace1.jsonl");
    const file2 = path.join(tmpDir, "trace2.jsonl");

    await fs.writeFile(
      file1,
      JSON.stringify({ run_id: "r1", task_id: "t1", input_tokens: 100, output_tokens: 50 }) + "\n",
      "utf8"
    );
    await fs.writeFile(
      file2,
      JSON.stringify({ run_id: "r2", task_id: "t1", input_tokens: 200, output_tokens: 50 }) + "\n",
      "utf8"
    );

    const loaded = await loadRecordsFromPath(tmpDir);
    expect(loaded.length).toBe(2);

    const result = aggregateUsage(loaded);
    expect(result.total_runs).toBe(2);
    expect(result.totals.input_tokens).toBe(300);
  });

  test("parseCliArgs parses all flags correctly", () => {
    const parsed = parseCliArgs([
      "--in",
      "records/usage",
      "--out",
      "records/my-summary.md",
      "--json",
      "records/summary.json",
      "--ledger",
      "records/my-ledger.tsv",
    ]);

    expect(parsed.inPath).toBe("records/usage");
    expect(parsed.outPath).toBe("records/my-summary.md");
    expect(parsed.emitJson).toBe(true);
    expect(parsed.jsonPath).toBe("records/summary.json");
    expect(parsed.appendLedgerFlag).toBe(true);
    expect(parsed.ledgerPath).toBe("records/my-ledger.tsv");
  });
});
