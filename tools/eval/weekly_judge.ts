/**
 * tools/eval/weekly_judge.ts
 *
 * Weekly offline LLM-as-a-judge batch runner and quality score blender.
 * Operationalizes research note docs/research/2026-10-16-llm-judge-evaluation-pipeline.md:
 * - Scans completed tasks from the preceding N days (default: 7).
 * - Gathers git diff ranges and associated telemetry from records/usage-ledger.tsv.
 * - Executes runJudge() from tools/eval/judge_runner.ts.
 * - Computes blended composite quality scores: 0.60 * det + 0.40 * judge.
 * - Updates records/usage-ledger.tsv in-place, recording blended quality scores
 *   and structured notes (judge:<model>;score=...;f=...;verdict).
 */

import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import {
  computeCompositeQualityScore,
  runJudge,
  type JudgeEvaluationOutput,
  type JudgeRunnerOptions,
} from "./judge_runner";

export interface LedgerRow {
  timestamp: string;
  run_id: string;
  task_id: string;
  epic_id: string;
  host: string;
  model: string;
  condition: string;
  input_tokens: string;
  output_tokens: string;
  cache_read_tokens: string;
  cache_write_tokens: string;
  total_tokens: string;
  cache_ratio: string;
  cost_usd: string;
  duration_s: string;
  quality_score: string;
  state: string;
  note: string;
  rawColumns: string[];
}

export interface CompletedTaskInfo {
  taskId: string;
  filePath: string;
  status: string;
  taskDate?: Date;
  verifiedAt?: string;
  baselineSha?: string;
  gitDiffRange?: string;
  content: string;
  telemetryRows: LedgerRow[];
}

export interface WeeklyJudgeOptions {
  /** Days to look back for completed tasks (default: 7). */
  days?: number;
  /** Directory containing task markdown records (default: "tasks"). */
  tasksDir?: string;
  /** Path to usage ledger TSV (default: "records/usage-ledger.tsv"). */
  ledgerPath?: string;
  /** Model identifier for the judge (e.g., 'claude-3-5-haiku', 'offline-heuristic'). */
  model?: string;
  /** Reference date for the evaluation window (default: current date). */
  referenceDate?: Date;
  /** Specific task IDs to evaluate (filters directory scan). */
  taskIds?: string[];
  /** Dry-run mode: evaluates without updating ledger or calling live inference. */
  dryRun?: boolean;
  /** Offline mode: evaluates heuristically without external inference. */
  offline?: boolean;
  /** Spending budget ceiling in USD. */
  maxBudgetUsd?: number;
  /** Output directory for evaluation markdown reports (optional). */
  outputDir?: string;
  /** Custom model invoker function (for testing or custom inference backends). */
  modelInvoker?: (prompt: string, model: string) => Promise<string>;
}

export interface WeeklyJudgeSummary {
  passed: number;
  failed: number;
  blocked: number;
  averageJudgeScore: number;
  averageCompositeScore: number;
}

export interface WeeklyJudgeResult {
  tasksScanned: number;
  tasksEvaluated: number;
  ledgerRowsUpdated: number;
  completedTasks: CompletedTaskInfo[];
  evaluations: JudgeEvaluationOutput[];
  summary: WeeklyJudgeSummary;
}

/**
 * Extracts baseline commit SHA, verified_at commit SHA, and git diff range
 * from a task artifact markdown content.
 */
export function extractGitDiffRange(taskContent: string): {
  baselineSha?: string;
  verifiedAt?: string;
  gitDiffRange?: string;
} {
  let verifiedAt: string | undefined;
  const verifiedMatch = taskContent.match(/verified_at:\s*["']?([a-f0-9]{7,40})["']?/i);
  if (verifiedMatch) {
    verifiedAt = verifiedMatch[1];
  }

  let baselineSha: string | undefined;
  const lines = taskContent.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && /\|\s*B\d*\s*\|/i.test(trimmed)) {
      const parts = trimmed.split("|").map((p) => p.trim());
      // In table | ID | Check | Result | Ref | Note |
      // parts[1] is ID, parts[2] is Check, parts[3] is Result, parts[4] is Ref
      if (parts.length >= 5) {
        const refCandidate = parts[4];
        const shaMatch = refCandidate.match(/^[a-f0-9]{7,40}$/i);
        if (shaMatch) {
          baselineSha = shaMatch[0];
          break;
        }
      }
    }
  }

  let gitDiffRange: string | undefined;
  if (baselineSha && verifiedAt) {
    gitDiffRange = `${baselineSha}..${verifiedAt}`;
  } else if (verifiedAt) {
    gitDiffRange = `${verifiedAt}~1..${verifiedAt}`;
  }

  return { baselineSha, verifiedAt, gitDiffRange };
}

/**
 * Safely parses the 18-column TSV ledger into structured LedgerRow objects.
 */
export function parseLedger(tsvContent: string): { headers: string[]; rows: LedgerRow[] } {
  const lines = tsvContent.split("\n");
  if (lines.length === 0 || !lines[0].trim()) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split("\t").map((h) => h.trim());
  const rows: LedgerRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split("\t");

    rows.push({
      timestamp: cols[0] ?? "",
      run_id: cols[1] ?? "",
      task_id: cols[2] ?? "",
      epic_id: cols[3] ?? "",
      host: cols[4] ?? "",
      model: cols[5] ?? "",
      condition: cols[6] ?? "",
      input_tokens: cols[7] ?? "",
      output_tokens: cols[8] ?? "",
      cache_read_tokens: cols[9] ?? "",
      cache_write_tokens: cols[10] ?? "",
      total_tokens: cols[11] ?? "",
      cache_ratio: cols[12] ?? "",
      cost_usd: cols[13] ?? "",
      duration_s: cols[14] ?? "",
      quality_score: cols[15] ?? "",
      state: cols[16] ?? "",
      note: cols[17] ?? "",
      rawColumns: cols,
    });
  }

  return { headers, rows };
}

/**
 * Serializes parsed headers and LedgerRow objects back to the canonical 18-column TSV format.
 */
export function serializeLedger(headers: string[], rows: LedgerRow[]): string {
  if (headers.length === 0 && rows.length === 0) return "";
  const headerLine = headers.join("\t");
  const dataLines = rows.map((r) => {
    const cols = [
      r.timestamp,
      r.run_id,
      r.task_id,
      r.epic_id,
      r.host,
      r.model,
      r.condition,
      r.input_tokens,
      r.output_tokens,
      r.cache_read_tokens,
      r.cache_write_tokens,
      r.total_tokens,
      r.cache_ratio,
      r.cost_usd,
      r.duration_s,
      r.quality_score,
      r.state,
      r.note,
    ];
    return cols.join("\t");
  });

  return [headerLine, ...dataLines].join("\n") + "\n";
}

/**
 * Formats structured note for the ledger adhering to Section 5.3 of the research note:
 * judge:<model>;score=<score>;f=<count>;<verdict>
 */
export function formatJudgeNote(
  model: string,
  judgeScore: number,
  verdict: "pass" | "fail" | "blocked",
  findingsCount: number = 0,
): string {
  const scoreStr = judgeScore.toFixed(2);
  return `judge:${model};score=${scoreStr};f=${findingsCount};${verdict}`;
}

/**
 * Scans task files in tasksDir completed within the preceding N days window.
 */
export async function scanCompletedTasks(
  options: WeeklyJudgeOptions = {},
): Promise<CompletedTaskInfo[]> {
  const tasksDir = path.resolve(options.tasksDir ?? "tasks");
  const days = options.days ?? 7;
  const referenceDate = options.referenceDate ?? new Date();
  const refTime = referenceDate.getTime();
  const cutoffTime = refTime - days * 24 * 60 * 60 * 1000;

  if (!existsSync(tasksDir)) {
    return [];
  }

  const files = await fs.readdir(tasksDir);
  const taskFiles = files.filter(
    (f) => f.endsWith(".md") && !f.includes("template") && !f.startsWith(".")
  );

  // Read existing ledger if available to associate telemetry
  let ledgerRows: LedgerRow[] = [];
  const ledgerPath = path.resolve(options.ledgerPath ?? "records/usage-ledger.tsv");
  if (existsSync(ledgerPath)) {
    try {
      const ledgerContent = await fs.readFile(ledgerPath, "utf8");
      ledgerRows = parseLedger(ledgerContent).rows;
    } catch {
      // ledger unreadable, proceed with empty telemetry
    }
  }

  const completedTasks: CompletedTaskInfo[] = [];

  for (const filename of taskFiles) {
    const filePath = path.join(tasksDir, filename);
    const taskId = path.basename(filename, ".md");

    if (options.taskIds && options.taskIds.length > 0 && !options.taskIds.includes(taskId)) {
      continue;
    }

    try {
      const content = await fs.readFile(filePath, "utf8");

      // Verify schema is task/1
      const schemaMatch = content.match(/schema:\s*task\/[0-9]+/i);
      if (!schemaMatch) continue;

      // Extract status
      const statusMatch = content.match(/status:\s*([a-z_-]+)/i);
      const status = statusMatch ? statusMatch[1].toLowerCase() : "";

      // Only completed, verified, or accepted tasks count as completed
      const isCompleted =
        status === "verified" || status === "completed" || status === "accepted";
      if (!isCompleted) continue;

      // Extract date: first from filename YYYY-MM-DD, then from file mtime
      let taskDate: Date | undefined;
      const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        taskDate = new Date(`${dateMatch[1]}T00:00:00Z`);
      } else {
        const stat = await fs.stat(filePath);
        taskDate = stat.mtime;
      }

      // Check evaluation time window: [cutoffTime, refTime + 24h]
      const taskTime = taskDate.getTime();
      const inWindow =
        taskTime >= cutoffTime && taskTime <= refTime + 24 * 60 * 60 * 1000;
      if (!inWindow) continue;

      // Extract git diff range and baseline SHA
      const diffInfo = extractGitDiffRange(content);

      // Associate telemetry rows from usage-ledger.tsv
      const matchingTelemetry = ledgerRows.filter((r) => r.task_id === taskId);

      completedTasks.push({
        taskId,
        filePath,
        status,
        taskDate,
        verifiedAt: diffInfo.verifiedAt,
        baselineSha: diffInfo.baselineSha,
        gitDiffRange: diffInfo.gitDiffRange,
        content,
        telemetryRows: matchingTelemetry,
      });
    } catch {
      // skip unreadable task files
    }
  }

  // Sort chronologically by task date
  return completedTasks.sort((a, b) => (a.taskDate?.getTime() ?? 0) - (b.taskDate?.getTime() ?? 0));
}

/**
 * Main weekly LLM-as-a-judge execution loop.
 * Blends deterministic quality scores with judge evaluation and updates records/usage-ledger.tsv in-place.
 */
export async function runWeeklyJudge(
  options: WeeklyJudgeOptions = {},
): Promise<WeeklyJudgeResult> {
  const model = options.model ?? "offline-heuristic";
  const ledgerPath = path.resolve(options.ledgerPath ?? "records/usage-ledger.tsv");

  // 1. Scan completed tasks in evaluation window
  const completedTasks = await scanCompletedTasks(options);

  if (completedTasks.length === 0) {
    return {
      tasksScanned: 0,
      tasksEvaluated: 0,
      ledgerRowsUpdated: 0,
      completedTasks: [],
      evaluations: [],
      summary: {
        passed: 0,
        failed: 0,
        blocked: 0,
        averageJudgeScore: 0,
        averageCompositeScore: 0,
      },
    };
  }

  // 2. Execute runJudge() for all completed tasks
  const runnerOptions: JudgeRunnerOptions = {
    targets: completedTasks.map((t) => t.filePath),
    model,
    offline: options.offline,
    dryRun: options.dryRun,
    maxBudgetUsd: options.maxBudgetUsd,
    modelInvoker: options.modelInvoker,
  };

  const evaluations = await runJudge(runnerOptions);

  // Map evaluations by taskId for fast lookup
  const evalByTaskId = new Map<string, JudgeEvaluationOutput>();
  for (const ev of evaluations) {
    // target_id could be full path or taskId
    const id = path.basename(ev.target_id, ".md");
    evalByTaskId.set(id, ev);
    evalByTaskId.set(ev.target_id, ev);
  }

  // 3. Load and update records/usage-ledger.tsv in-place
  let ledgerRowsUpdated = 0;
  let totalJudgeScore = 0;
  let totalCompositeScore = 0;
  let passedCount = 0;
  let failedCount = 0;
  let blockedCount = 0;

  for (const ev of evaluations) {
    totalJudgeScore += ev.overall_score;
    if (ev.verdict === "pass") passedCount++;
    else if (ev.verdict === "fail") failedCount++;
    else blockedCount++;
  }

  if (existsSync(ledgerPath)) {
    const rawContent = await fs.readFile(ledgerPath, "utf8");
    const { headers, rows } = parseLedger(rawContent);

    for (const row of rows) {
      const ev = evalByTaskId.get(row.task_id);
      if (!ev) continue;

      // Extract deterministic score (default 1.0 if not a valid number)
      let detScore = 1.0;
      if (row.quality_score && row.quality_score !== "-" && row.quality_score !== "unsupported") {
        const parsed = parseFloat(row.quality_score);
        if (!isNaN(parsed)) {
          detScore = parsed;
        }
      }

      // Compute composite quality score: 0.60 * det + 0.40 * judge
      const composite = computeCompositeQualityScore(detScore, ev.overall_score, ev.verdict);
      totalCompositeScore += composite;

      // Format structured note
      const nonCriticalFindings = ev.findings
        ? ev.findings.filter((f) => f.severity !== "critical").length
        : 0;
      const noteStr = formatJudgeNote(model, ev.overall_score, ev.verdict, nonCriticalFindings);

      // Update in-place
      row.quality_score = composite.toFixed(2);
      row.note = noteStr;
      ledgerRowsUpdated++;
    }

    if (!options.dryRun && ledgerRowsUpdated > 0) {
      const updatedTsv = serializeLedger(headers, rows);
      await fs.writeFile(ledgerPath, updatedTsv, "utf8");
    }
  }

  // 4. Optionally write markdown evaluation reports if outputDir is specified
  if (options.outputDir) {
    const resolvedOut = path.resolve(options.outputDir);
    await fs.mkdir(resolvedOut, { recursive: true });
    for (const ev of evaluations) {
      const dateStr = ev.timestamp.substring(0, 10);
      const reportFile = path.join(resolvedOut, `${dateStr}-${ev.evaluation_id}.md`);
      const mdReport = `# LLM-as-a-Judge Evaluation Report: ${ev.target_id}

- **Evaluation ID:** \`${ev.evaluation_id}\`
- **Timestamp:** ${ev.timestamp}
- **Model:** \`${model}\`
- **Overall Score:** ${ev.overall_score.toFixed(2)}
- **Verdict:** \`${ev.verdict}\`

## Rubric Scores
| Dimension | Score | Reasoning |
|---|---|---|
| Contract Adherence | ${ev.rubric_scores.contract_adherence.score.toFixed(2)} | ${ev.rubric_scores.contract_adherence.reasoning} |
| Token Economy | ${ev.rubric_scores.token_economy.score.toFixed(2)} | ${ev.rubric_scores.token_economy.reasoning} |
| Semantic Integrity | ${ev.rubric_scores.semantic_integrity.score.toFixed(2)} | ${ev.rubric_scores.semantic_integrity.reasoning} |
| Vocabulary Discipline | ${ev.rubric_scores.vocabulary_discipline.score.toFixed(2)} | ${ev.rubric_scores.vocabulary_discipline.reasoning} |

## Findings (${ev.findings.length})
${
  ev.findings.length === 0
    ? "No findings detected."
    : ev.findings
        .map(
          (f) =>
            `- [${f.severity.toUpperCase()}] **${f.dimension}**: ${f.message} (Citation: \`${f.citation}\`)`
        )
        .join("\n")
}
`;
      await fs.writeFile(reportFile, mdReport, "utf8");
    }
  }

  const avgJudge = evaluations.length > 0 ? totalJudgeScore / evaluations.length : 0;
  const avgComposite =
    ledgerRowsUpdated > 0
      ? totalCompositeScore / ledgerRowsUpdated
      : evaluations.length > 0
      ? totalJudgeScore / evaluations.length
      : 0;

  return {
    tasksScanned: completedTasks.length,
    tasksEvaluated: evaluations.length,
    ledgerRowsUpdated,
    completedTasks,
    evaluations,
    summary: {
      passed: passedCount,
      failed: failedCount,
      blocked: blockedCount,
      averageJudgeScore: Math.round(avgJudge * 100) / 100,
      averageCompositeScore: Math.round(avgComposite * 100) / 100,
    },
  };
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  const options: WeeklyJudgeOptions = {
    offline: args.includes("--offline"),
    dryRun: args.includes("--dry-run"),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days" && args[i + 1]) {
      options.days = parseInt(args[++i], 10);
    } else if (args[i] === "--ledger" && args[i + 1]) {
      options.ledgerPath = args[++i];
    } else if (args[i] === "--tasks-dir" && args[i + 1]) {
      options.tasksDir = args[++i];
    } else if (args[i] === "--model" && args[i + 1]) {
      options.model = args[++i];
    } else if (args[i] === "--output-dir" && args[i + 1]) {
      options.outputDir = args[++i];
    } else if (args[i] === "--task" && args[i + 1]) {
      options.taskIds = [args[++i]];
    } else if (args[i] === "--max-budget-usd" && args[i + 1]) {
      options.maxBudgetUsd = parseFloat(args[++i]);
    }
  }

  runWeeklyJudge(options)
    .then((result) => {
      console.log(
        `Weekly judge complete: ${result.tasksEvaluated} tasks evaluated, ${result.ledgerRowsUpdated} ledger rows blended.`
      );
      console.log(
        `Results: ${result.summary.passed} pass, ${result.summary.failed} fail, ${result.summary.blocked} blocked.`
      );
      console.log(
        `Average judge score: ${result.summary.averageJudgeScore.toFixed(2)}, average composite score: ${result.summary.averageCompositeScore.toFixed(2)}.`
      );
      const hasCritical = result.summary.failed > 0;
      process.exit(hasCritical ? 1 : 0);
    })
    .catch((err) => {
      console.error(`weekly_judge error: ${String(err)}`);
      process.exit(1);
    });
}
