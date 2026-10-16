/**
 * tools/eval/weekly_judge.test.ts
 *
 * Hermetic unit test suite for weekly LLM-as-a-judge batch runner.
 * Tests task scanning, git diff range extraction, ledger in-place updating,
 * composite score blending (0.60 * det + 0.40 * judge), and note formatting.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { tmpdir } from "node:os";
import {
  extractGitDiffRange,
  formatJudgeNote,
  parseLedger,
  runWeeklyJudge,
  scanCompletedTasks,
  serializeLedger,
  type CompletedTaskInfo,
  type LedgerRow,
  type WeeklyJudgeOptions,
} from "./weekly_judge";
import type { JudgeEvaluationOutput } from "./judge_runner";

describe("weekly_judge", () => {
  let tempDir: string;
  let mockTasksDir: string;
  let mockLedgerPath: string;

  beforeEach(async () => {
    tempDir = path.join(tmpdir(), `weekly-judge-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    mockTasksDir = path.join(tempDir, "tasks");
    mockLedgerPath = path.join(tempDir, "records", "usage-ledger.tsv");
    await fs.mkdir(mockTasksDir, { recursive: true });
    await fs.mkdir(path.dirname(mockLedgerPath), { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("extractGitDiffRange", () => {
    it("extracts baseline SHA and verified_at from valid task artifact", () => {
      const taskMd = `---
schema: task/1
status: verified
verified_at: "c76f884"
---
# Sample Task
## Verification
| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | test baseline | pass | e1b407a | baseline verification |
| AC1 | feature check | pass | c76f884 | verified |
`;
      const res = extractGitDiffRange(taskMd);
      expect(res.verifiedAt).toBe("c76f884");
      expect(res.baselineSha).toBe("e1b407a");
      expect(res.gitDiffRange).toBe("e1b407a..c76f884");
    });

    it("falls back to single-commit range when baseline SHA is absent", () => {
      const taskMd = `---
schema: task/1
status: verified
verified_at: "a1b2c3d"
---
# No baseline table
`;
      const res = extractGitDiffRange(taskMd);
      expect(res.verifiedAt).toBe("a1b2c3d");
      expect(res.baselineSha).toBeUndefined();
      expect(res.gitDiffRange).toBe("a1b2c3d~1..a1b2c3d");
    });

    it("returns undefined range when no commit hashes are present", () => {
      const taskMd = `# Empty task without frontmatter`;
      const res = extractGitDiffRange(taskMd);
      expect(res.verifiedAt).toBeUndefined();
      expect(res.baselineSha).toBeUndefined();
      expect(res.gitDiffRange).toBeUndefined();
    });
  });

  describe("formatJudgeNote", () => {
    it("formats note adhering to research note Section 5.3 specification", () => {
      const note = formatJudgeNote("claude-3-5-haiku", 0.92, "pass", 0);
      expect(note).toBe("judge:claude-3-5-haiku;score=0.92;f=0;pass");
    });

    it("formats non-zero finding counts and fail verdict correctly", () => {
      const note = formatJudgeNote("offline-heuristic", 0.45, "fail", 3);
      expect(note).toBe("judge:offline-heuristic;score=0.45;f=3;fail");
    });
  });

  describe("parseLedger and serializeLedger", () => {
    it("round-trips standard 18-column TSV ledger cleanly", () => {
      const header = "timestamp\trun_id\ttask_id\tepic_id\thost\tmodel\tcondition\tinput_tokens\toutput_tokens\tcache_read_tokens\tcache_write_tokens\ttotal_tokens\tcache_ratio\tcost_usd\tduration_s\tquality_score\tstate\tnote";
      const row1 = "2026-10-16T12:00:00Z\trun-1\ttask-1\tepic-1\tantigravity\tgemini\twith\t1000\t200\t500\t0\t1200\t0.5000\t0.0100\t10.5\t1.00\tobserved\tinitial note";
      const tsv = `${header}\n${row1}\n`;

      const parsed = parseLedger(tsv);
      expect(parsed.headers.length).toBe(18);
      expect(parsed.rows.length).toBe(1);
      expect(parsed.rows[0].task_id).toBe("task-1");
      expect(parsed.rows[0].quality_score).toBe("1.00");
      expect(parsed.rows[0].note).toBe("initial note");

      const serialized = serializeLedger(parsed.headers, parsed.rows);
      expect(serialized).toBe(tsv);
    });
  });

  describe("scanCompletedTasks", () => {
    it("scans only completed tasks within the 7-day evaluation window", async () => {
      const refDate = new Date("2026-10-16T12:00:00Z");

      // Task 1: Within window, verified -> included
      await fs.writeFile(
        path.join(mockTasksDir, "2026-10-15-task-recent.md"),
        `---
schema: task/1
status: verified
verified_at: "1111111"
---
## Verification
| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | base | pass | 0000000 | ok |
`
      );

      // Task 2: Within window, but active (in progress) -> excluded
      await fs.writeFile(
        path.join(mockTasksDir, "2026-10-14-task-in-progress.md"),
        `---
schema: task/1
status: active
---
`
      );

      // Task 3: Outside window (12 days ago) -> excluded
      await fs.writeFile(
        path.join(mockTasksDir, "2026-10-02-task-old.md"),
        `---
schema: task/1
status: verified
verified_at: "2222222"
---
`
      );

      // Task 4: Template -> excluded
      await fs.writeFile(
        path.join(mockTasksDir, "task-template.md"),
        `---
schema: task/1
status: verified
---
`
      );

      const tasks = await scanCompletedTasks({
        tasksDir: mockTasksDir,
        referenceDate: refDate,
        days: 7,
      });

      expect(tasks.length).toBe(1);
      expect(tasks[0].taskId).toBe("2026-10-15-task-recent");
      expect(tasks[0].status).toBe("verified");
      expect(tasks[0].gitDiffRange).toBe("0000000..1111111");
    });

    it("associates corresponding telemetry rows from usage ledger", async () => {
      const refDate = new Date("2026-10-16T12:00:00Z");
      const taskId = "2026-10-15-my-task";

      await fs.writeFile(
        path.join(mockTasksDir, `${taskId}.md`),
        `---
schema: task/1
status: completed
---
`
      );

      const tsvContent = `timestamp\trun_id\ttask_id\tepic_id\thost\tmodel\tcondition\tinput_tokens\toutput_tokens\tcache_read_tokens\tcache_write_tokens\ttotal_tokens\tcache_ratio\tcost_usd\tduration_s\tquality_score\tstate\tnote
2026-10-15T10:00:00Z\trun-a\t${taskId}\tepic-1\tclaude-code\thaiku\twith\t500\t100\t200\t0\t600\t0.3333\t0.0050\t4.0\t1.00\tobserved\t-
2026-10-15T11:00:00Z\trun-b\t${taskId}\tepic-1\tclaude-code\thaiku\twithout\t800\t150\t0\t0\t950\t0.0000\t0.0080\t6.0\t0.80\tobserved\t-
2026-10-15T12:00:00Z\trun-c\tother-task\tepic-1\tclaude-code\thaiku\twith\t500\t100\t200\t0\t600\t0.3333\t0.0050\t4.0\t1.00\tobserved\t-
`;
      await fs.writeFile(mockLedgerPath, tsvContent);

      const tasks = await scanCompletedTasks({
        tasksDir: mockTasksDir,
        ledgerPath: mockLedgerPath,
        referenceDate: refDate,
      });

      expect(tasks.length).toBe(1);
      expect(tasks[0].telemetryRows.length).toBe(2);
      expect(tasks[0].telemetryRows.map((r) => r.run_id)).toEqual(["run-a", "run-b"]);
    });
  });

  describe("runWeeklyJudge execution and ledger blending", () => {
    it("blends deterministic and judge scores in-place into records/usage-ledger.tsv", async () => {
      const refDate = new Date("2026-10-16T12:00:00Z");
      const taskId = "2026-10-16-eval-target";

      // Create completed task artifact complying with contracts
      const taskMd = `---
schema: task/1
status: verified
verified_at: "abc1234"
---
# Compliant Task
## Routing and approvals
- tier: standard
## Verification
| ID | Check | Result | Ref | Note |
|---|---|---|---|---|
| B1 | base check | pass | def5678 | pass |
| V1 | verify | pass | abc1234 | pass |
`;
      await fs.writeFile(path.join(mockTasksDir, `${taskId}.md`), taskMd);

      // Create ledger with initial deterministic scores: 1.00 and 0.50
      const initialLedger = `timestamp\trun_id\ttask_id\tepic_id\thost\tmodel\tcondition\tinput_tokens\toutput_tokens\tcache_read_tokens\tcache_write_tokens\ttotal_tokens\tcache_ratio\tcost_usd\tduration_s\tquality_score\tstate\tnote
2026-10-16T10:00:00Z\trun-1\t${taskId}\tepic-1\tantigravity\tgemini\twith\t1000\t200\t500\t0\t1200\t0.5000\t0.0100\t10.5\t1.00\tobserved\tinitial-note-1
2026-10-16T11:00:00Z\trun-2\t${taskId}\tepic-1\tantigravity\tgemini\twithout\t2000\t300\t0\t0\t2300\t0.0000\t0.0200\t15.0\t0.50\tobserved\tinitial-note-2
2026-10-16T11:30:00Z\trun-3\tunrelated-task\tepic-1\tantigravity\tgemini\twith\t500\t100\t0\t0\t600\t0.0000\t0.0050\t5.0\t0.90\tobserved\tunrelated-note
`;
      await fs.writeFile(mockLedgerPath, initialLedger);

      // Mock model invoker that returns a valid JudgeEvaluationOutput JSON
      const mockInvoker = async (prompt: string, model: string): Promise<string> => {
        const mockOutput: JudgeEvaluationOutput = {
          evaluation_id: "judge-eval-test-01",
          target_id: path.join(mockTasksDir, `${taskId}.md`),
          timestamp: "2026-10-16T12:00:00Z",
          overall_score: 0.80,
          rubric_scores: {
            contract_adherence: { score: 1.0, reasoning: "Valid" },
            token_economy: { score: 0.8, reasoning: "Good" },
            semantic_integrity: { score: 0.7, reasoning: "OK" },
            vocabulary_discipline: { score: 0.7, reasoning: "OK" },
          },
          findings: [
            {
              dimension: "token_economy",
              severity: "info",
              citation: "Compliant Task",
              message: "Acceptable economy.",
            },
          ],
          verdict: "pass",
        };
        return JSON.stringify(mockOutput);
      };

      const result = await runWeeklyJudge({
        tasksDir: mockTasksDir,
        ledgerPath: mockLedgerPath,
        referenceDate: refDate,
        model: "claude-3-5-haiku",
        modelInvoker: mockInvoker,
      });

      expect(result.tasksScanned).toBe(1);
      expect(result.tasksEvaluated).toBe(1);
      expect(result.ledgerRowsUpdated).toBe(2);
      expect(result.summary.passed).toBe(1);
      expect(result.summary.failed).toBe(0);

      // Read back the updated ledger from disk
      const updatedLedgerContent = await fs.readFile(mockLedgerPath, "utf8");
      const { rows } = parseLedger(updatedLedgerContent);

      expect(rows.length).toBe(3);

      // Row 1: det = 1.00, judge = 0.80 -> composite = 0.60 * 1.00 + 0.40 * 0.80 = 0.92
      const updatedRow1 = rows.find((r) => r.run_id === "run-1")!;
      expect(updatedRow1.quality_score).toBe("0.92");
      expect(updatedRow1.note).toBe("judge:claude-3-5-haiku;score=0.80;f=1;pass");

      // Row 2: det = 0.50, judge = 0.80 -> composite = 0.60 * 0.50 + 0.40 * 0.80 = 0.30 + 0.32 = 0.62
      const updatedRow2 = rows.find((r) => r.run_id === "run-2")!;
      expect(updatedRow2.quality_score).toBe("0.62");
      expect(updatedRow2.note).toBe("judge:claude-3-5-haiku;score=0.80;f=1;pass");

      // Row 3: unrelated task -> untouched!
      const updatedRow3 = rows.find((r) => r.run_id === "run-3")!;
      expect(updatedRow3.quality_score).toBe("0.90");
      expect(updatedRow3.note).toBe("unrelated-note");
    });

    it("caps composite score at 0.00 if judge verdict is fail", async () => {
      const refDate = new Date("2026-10-16T12:00:00Z");
      const taskId = "2026-10-16-eval-fail";

      await fs.writeFile(
        path.join(mockTasksDir, `${taskId}.md`),
        `---
schema: task/1
status: verified
---
# Invalid vocabulary
Presumably passes all tests.
`
      );

      const initialLedger = `timestamp\trun_id\ttask_id\tepic_id\thost\tmodel\tcondition\tinput_tokens\toutput_tokens\tcache_read_tokens\tcache_write_tokens\ttotal_tokens\tcache_ratio\tcost_usd\tduration_s\tquality_score\tstate\tnote
2026-10-16T10:00:00Z\trun-1\t${taskId}\tepic-1\tantigravity\tgemini\twith\t1000\t200\t0\t0\t1200\t0.0000\t0.0100\t10.5\t1.00\tobserved\t-
`;
      await fs.writeFile(mockLedgerPath, initialLedger);

      // Evaluate offline (heuristic will catch forbidden phrase "presumably passes" and return verdict fail)
      const result = await runWeeklyJudge({
        tasksDir: mockTasksDir,
        ledgerPath: mockLedgerPath,
        referenceDate: refDate,
        offline: true,
        model: "offline-heuristic",
      });

      expect(result.summary.failed).toBe(1);

      const updatedLedgerContent = await fs.readFile(mockLedgerPath, "utf8");
      const { rows } = parseLedger(updatedLedgerContent);
      const row = rows[0];

      // Score must be capped at 0.00 on fail verdict
      expect(row.quality_score).toBe("0.00");
      expect(row.note).toContain(";fail");
    });

    it("respects --dry-run mode without mutating ledger file on disk", async () => {
      const refDate = new Date("2026-10-16T12:00:00Z");
      const taskId = "2026-10-16-eval-dryrun";

      await fs.writeFile(
        path.join(mockTasksDir, `${taskId}.md`),
        `---
schema: task/1
status: verified
---
# Simple Task
`
      );

      const initialLedger = `timestamp\trun_id\ttask_id\tepic_id\thost\tmodel\tcondition\tinput_tokens\toutput_tokens\tcache_read_tokens\tcache_write_tokens\ttotal_tokens\tcache_ratio\tcost_usd\tduration_s\tquality_score\tstate\tnote
2026-10-16T10:00:00Z\trun-1\t${taskId}\tepic-1\tantigravity\tgemini\twith\t1000\t200\t0\t0\t1200\t0.0000\t0.0100\t10.5\t1.00\tobserved\tunmodified-note
`;
      await fs.writeFile(mockLedgerPath, initialLedger);

      const result = await runWeeklyJudge({
        tasksDir: mockTasksDir,
        ledgerPath: mockLedgerPath,
        referenceDate: refDate,
        dryRun: true,
      });

      expect(result.tasksEvaluated).toBe(1);

      // Content on disk should be completely unchanged
      const content = await fs.readFile(mockLedgerPath, "utf8");
      expect(content).toBe(initialLedger);
    });
  });
});
