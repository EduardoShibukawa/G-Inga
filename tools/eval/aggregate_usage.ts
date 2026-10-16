/**
 * tools/eval/aggregate_usage.ts
 *
 * Multi-host local usage telemetry aggregator, summary generator, and ledger tracker.
 * Operationalizes ADR 0006 for continuous telemetry:
 * - Aggregates JSONL telemetry traces grouped by epic_id, task_id, run_id, host, and condition.
 * - Computes total tokens, cache hit ratios, cost estimates, and wall durations.
 * - Generates human-readable Markdown comparison tables (with vs without, per-task, per-host).
 * - Emits structured JSON summary metrics.
 * - Appends normalized run records to records/usage-ledger.tsv adhering to ADR 0006 taxonomy.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  sanitizeText,
  type MeasureState,
  type UsageObservation,
} from "./collect_usage";

export type { MeasureState };

export interface RawRecordInput {
  run_id?: string;
  runId?: string;
  scope_id?: string;
  task_id?: string;
  taskId?: string;
  epic_id?: string;
  epicId?: string;
  host?: string;
  model?: string;
  condition?: "with" | "without" | string;
  timestamp?: string;
  input_tokens?: number | { value?: number; state?: MeasureState; note?: string };
  output_tokens?: number | { value?: number; state?: MeasureState; note?: string };
  cache_read_tokens?: number | { value?: number; state?: MeasureState; note?: string };
  cache_write_tokens?: number | { value?: number; state?: MeasureState; note?: string };
  thinking_tokens?: number | { value?: number; state?: MeasureState; note?: string };
  total_tokens?: number | { value?: number; state?: MeasureState; note?: string };
  wall_duration_seconds?: number | { value?: number; state?: MeasureState; note?: string };
  duration_s?: number | { value?: number; state?: MeasureState; note?: string };
  cost_usd_estimate?: number | { value?: number; state?: MeasureState; note?: string };
  cost_usd?: number | { value?: number; state?: MeasureState; note?: string };
  quality_score?: number | string;
  qualityScore?: number | string;
  state?: MeasureState | string;
  note?: string;
  observation?: UsageObservation;
}

export interface RunFieldStates {
  input: MeasureState;
  output: MeasureState;
  cache_read: MeasureState;
  cache_write: MeasureState;
  total: MeasureState;
  cost: MeasureState;
  duration: MeasureState;
}

export interface AggregatedRun {
  run_id: string;
  task_id: string;
  epic_id: string;
  host: string;
  model: string;
  condition: "with" | "without";
  timestamp: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  thinking_tokens: number;
  total_tokens: number;
  cache_ratio: number;
  cost_usd: number;
  duration_s: number;
  quality_score: number | string;
  state: MeasureState | string;
  note: string;
  observation_count: number;
  states: RunFieldStates;
}

export interface ConditionSummary {
  condition: "with" | "without";
  run_count: number;
  total_tokens: number;
  mean_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cache_ratio: number;
  cost_usd: number;
  mean_cost_usd: number;
  duration_s: number;
  mean_duration_s: number;
}

export interface TaskSummary {
  task_id: string;
  runs: number;
  with_runs: number;
  without_runs: number;
  total_tokens: number;
  with_tokens: number;
  without_tokens: number;
  token_savings_pct: number;
  cache_ratio: number;
  cost_usd: number;
  duration_s: number;
}

export interface HostSummary {
  host: string;
  run_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  cache_ratio: number;
  cost_usd: number;
  duration_s: number;
}

export interface EpicSummary {
  epic_id: string;
  run_count: number;
  total_tokens: number;
  cache_ratio: number;
  cost_usd: number;
  duration_s: number;
}

export interface AggregationResult {
  generated_at: string;
  total_runs: number;
  total_observations: number;
  runs: AggregatedRun[];
  totals: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cache_write_tokens: number;
    thinking_tokens: number;
    total_tokens: number;
    cache_ratio: number;
    cost_usd: number;
    duration_s: number;
  };
  by_condition: {
    with?: ConditionSummary;
    without?: ConditionSummary;
    delta?: {
      token_delta: number;
      token_savings_pct: number;
      cost_delta: number;
      duration_delta: number;
    };
  };
  by_task: Record<string, TaskSummary>;
  by_host: Record<string, HostSummary>;
  by_epic: Record<string, EpicSummary>;
}

export interface AggregateOptions {
  title?: string;
  now?: string;
}

export interface CliOptions {
  inPath?: string;
  outPath: string;
  jsonPath?: string;
  emitJson: boolean;
  ledgerPath?: string;
  appendLedgerFlag: boolean;
}

/**
 * Calculates cache hit ratio according to formula:
 * cache_read / (input + cache_read)
 */
export function calculateCacheRatio(cacheRead: number, input: number): number {
  const denominator = input + cacheRead;
  if (denominator <= 0) return 0;
  return cacheRead / denominator;
}

/**
 * Helper to extract numeric value and measurement state.
 */
function extractMetric(
  val: number | { value?: number; state?: MeasureState; note?: string } | undefined,
  defaultState: MeasureState = "observed"
): { value: number; hasValue: boolean; state: MeasureState; note?: string } {
  if (typeof val === "number") {
    return { value: val, hasValue: true, state: defaultState };
  }
  if (val && typeof val.value === "number") {
    return { value: val.value, hasValue: true, state: val.state || defaultState, note: val.note };
  }
  if (val && typeof (val as any).state === "string") {
    return { value: 0, hasValue: false, state: (val as any).state, note: (val as any).note };
  }
  return { value: 0, hasValue: false, state: "absent" };
}

/**
 * Resolves a field from either the root record or nested observation.
 */
function getRecordField(rec: RawRecordInput, key: keyof RawRecordInput): any {
  if (rec[key] !== undefined) return rec[key];
  if (rec.observation && (rec.observation as any)[key] !== undefined) {
    return (rec.observation as any)[key];
  }
  return undefined;
}

/**
 * Parses JSONL strings into an array of RawRecordInput objects.
 * Supports newline-delimited JSON as well as JSON arrays.
 */
export function parseJsonlRecords(content: string): RawRecordInput[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback to line by line
    }
  }

  const lines = trimmed.split("\n");
  const records: RawRecordInput[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      records.push(obj);
    } catch {
      // Ignore unparseable lines or comments
    }
  }

  return records;
}

/**
 * Reads standard input asynchronously.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Loads records from a file path, a directory of .jsonl files, or stdin.
 */
export async function loadRecordsFromPath(pathOrStdin: string): Promise<RawRecordInput[]> {
  if (
    pathOrStdin === "-stdin" ||
    pathOrStdin === "-" ||
    pathOrStdin === "--stdin" ||
    pathOrStdin === "/dev/stdin"
  ) {
    const raw = await readStdin();
    return parseJsonlRecords(raw);
  }

  const resolved = path.resolve(pathOrStdin);
  const stat = await fs.stat(resolved);

  if (stat.isDirectory()) {
    const records: RawRecordInput[] = [];
    const entries = await fs.readdir(resolved, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        const filePath = path.join(resolved, entry.name);
        const content = await fs.readFile(filePath, "utf8");
        records.push(...parseJsonlRecords(content));
      } else if (entry.isDirectory()) {
        const subRecords = await loadRecordsFromPath(path.join(resolved, entry.name));
        records.push(...subRecords);
      }
    }
    return records;
  }

  const content = await fs.readFile(resolved, "utf8");
  return parseJsonlRecords(content);
}

/**
 * Core aggregator function:
 * Groups raw observations by epic_id, task_id, run_id, host, and condition.
 */
export function aggregateUsage(
  rawInput: RawRecordInput[] | string[] | string,
  options: AggregateOptions = {}
): AggregationResult {
  let records: RawRecordInput[];
  if (typeof rawInput === "string") {
    records = parseJsonlRecords(rawInput);
  } else if (Array.isArray(rawInput) && rawInput.length > 0 && typeof rawInput[0] === "string") {
    records = parseJsonlRecords((rawInput as string[]).join("\n"));
  } else {
    records = (rawInput as RawRecordInput[]) || [];
  }

  const generatedAt = options.now || new Date().toISOString();

  // Group by (epic_id, task_id, run_id, host, condition)
  interface GroupAcc {
    epic_id: string;
    task_id: string;
    run_id: string;
    host: string;
    condition: "with" | "without";
    models: Set<string>;
    timestamps: string[];
    observations: RawRecordInput[];
    notes: string[];
    qualityScores: (number | string)[];
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    thinkingTokens: number;
    explicitTotalTokens: number;
    costUsd: number;
    durationSec: number;
    fieldStates: {
      input: MeasureState[];
      output: MeasureState[];
      cache_read: MeasureState[];
      cache_write: MeasureState[];
      total: MeasureState[];
      cost: MeasureState[];
      duration: MeasureState[];
      overall: MeasureState[];
    };
  }

  const groups = new Map<string, GroupAcc>();

  for (const rec of records) {
    const rawRunId =
      rec.run_id ||
      rec.runId ||
      rec.scope_id ||
      (rec.observation && rec.observation.scope_id) ||
      "run-01";
    const runId = sanitizeText(rawRunId);

    const rawTaskId = rec.task_id || rec.taskId || "continuous";
    const taskId = sanitizeText(rawTaskId);

    const rawEpicId = rec.epic_id || rec.epicId || "-";
    const epicId = sanitizeText(rawEpicId);

    const rawHost = rec.host || (rec.observation && rec.observation.host) || "unknown";
    const host = sanitizeText(rawHost);

    const condRaw = (rec.condition || "with").toString().toLowerCase();
    const condition: "with" | "without" = condRaw === "without" ? "without" : "with";

    const key = `${epicId}:::${taskId}:::${runId}:::${host}:::${condition}`;

    let acc = groups.get(key);
    if (!acc) {
      acc = {
        epic_id: epicId,
        task_id: taskId,
        run_id: runId,
        host,
        condition,
        models: new Set<string>(),
        timestamps: [],
        observations: [],
        notes: [],
        qualityScores: [],
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        thinkingTokens: 0,
        explicitTotalTokens: 0,
        costUsd: 0,
        durationSec: 0,
        fieldStates: {
          input: [],
          output: [],
          cache_read: [],
          cache_write: [],
          total: [],
          cost: [],
          duration: [],
          overall: [],
        },
      };
      groups.set(key, acc);
    }

    acc.observations.push(rec);

    if (rec.timestamp) acc.timestamps.push(rec.timestamp);
    if (rec.model) acc.models.add(sanitizeText(rec.model));
    if (rec.note) acc.notes.push(sanitizeText(rec.note));

    const qScore = rec.quality_score !== undefined ? rec.quality_score : rec.qualityScore;
    if (qScore !== undefined && qScore !== null && qScore !== "") {
      acc.qualityScores.push(qScore);
    }

    // Extract metrics
    const inMetric = extractMetric(getRecordField(rec, "input_tokens"));
    const outMetric = extractMetric(getRecordField(rec, "output_tokens"));
    const crMetric = extractMetric(getRecordField(rec, "cache_read_tokens"));
    const cwMetric = extractMetric(getRecordField(rec, "cache_write_tokens"));
    const thMetric = extractMetric(getRecordField(rec, "thinking_tokens"));
    const totMetric = extractMetric(getRecordField(rec, "total_tokens"));
    const durMetric = extractMetric(
      getRecordField(rec, "wall_duration_seconds") ?? getRecordField(rec, "duration_s")
    );
    const costMetric = extractMetric(
      getRecordField(rec, "cost_usd_estimate") ?? getRecordField(rec, "cost_usd"),
      "estimated"
    );

    acc.inputTokens += inMetric.value;
    acc.outputTokens += outMetric.value;
    acc.cacheReadTokens += crMetric.value;
    acc.cacheWriteTokens += cwMetric.value;
    acc.thinkingTokens += thMetric.value;
    if (totMetric.hasValue) {
      acc.explicitTotalTokens += totMetric.value;
    }
    acc.costUsd += costMetric.value;
    acc.durationSec += durMetric.value;

    acc.fieldStates.input.push(inMetric.state);
    acc.fieldStates.output.push(outMetric.state);
    acc.fieldStates.cache_read.push(crMetric.state);
    acc.fieldStates.cache_write.push(cwMetric.state);
    acc.fieldStates.total.push(totMetric.state);
    acc.fieldStates.cost.push(costMetric.state);
    acc.fieldStates.duration.push(durMetric.state);

    const overallState: MeasureState =
      (rec.state as MeasureState) ||
      (inMetric.hasValue || outMetric.hasValue ? "observed" : inMetric.state);
    acc.fieldStates.overall.push(overallState);
  }

  // Resolve state helper
  function resolveState(states: MeasureState[], fallback: MeasureState = "observed"): MeasureState {
    if (states.length === 0) return fallback;
    if (states.includes("collection_error")) return "collection_error";
    if (states.some((s) => s === "observed")) return "observed";
    if (states.some((s) => s === "derived")) return "derived";
    if (states.some((s) => s === "estimated")) return "estimated";
    if (states.every((s) => s === "unsupported")) return "unsupported";
    if (states.every((s) => s === "absent")) return "absent";
    return states[0] || fallback;
  }

  const aggregatedRuns: AggregatedRun[] = [];

  for (const group of groups.values()) {
    const inputState = resolveState(group.fieldStates.input, "observed");
    const outputState = resolveState(group.fieldStates.output, "observed");
    const cacheReadState = resolveState(group.fieldStates.cache_read, "observed");
    const cacheWriteState = resolveState(group.fieldStates.cache_write, "unsupported");
    const costState = resolveState(group.fieldStates.cost, "unsupported");
    const durationState = resolveState(group.fieldStates.duration, "observed");

    let totalTokens = group.explicitTotalTokens;
    let totalState = resolveState(group.fieldStates.total, "derived");
    if (totalTokens <= 0) {
      totalTokens =
        group.inputTokens +
        group.outputTokens +
        group.cacheReadTokens +
        group.cacheWriteTokens;
      if (totalTokens > 0) {
        totalState = "derived";
      }
    }

    const cacheRatio = calculateCacheRatio(group.cacheReadTokens, group.inputTokens);

    const overallState = resolveState(group.fieldStates.overall, "observed");

    const modelStr = group.models.size > 0 ? Array.from(group.models).join(", ") : "-";
    const timestampStr =
      group.timestamps.length > 0 ? group.timestamps[0] : generatedAt;
    const noteStr = group.notes.length > 0 ? group.notes.join("; ") : "-";

    let qualityScore: number | string = "-";
    if (group.qualityScores.length > 0) {
      const numericScores = group.qualityScores.filter((s) => typeof s === "number") as number[];
      if (numericScores.length > 0) {
        const sum = numericScores.reduce((a, b) => a + b, 0);
        qualityScore = Number((sum / numericScores.length).toFixed(2));
      } else {
        qualityScore = group.qualityScores[group.qualityScores.length - 1];
      }
    }

    aggregatedRuns.push({
      run_id: group.run_id,
      task_id: group.task_id,
      epic_id: group.epic_id,
      host: group.host,
      model: modelStr,
      condition: group.condition,
      timestamp: timestampStr,
      input_tokens: group.inputTokens,
      output_tokens: group.outputTokens,
      cache_read_tokens: group.cacheReadTokens,
      cache_write_tokens: group.cacheWriteTokens,
      thinking_tokens: group.thinkingTokens,
      total_tokens: totalTokens,
      cache_ratio: cacheRatio,
      cost_usd: Number(group.costUsd.toFixed(4)),
      duration_s: Number(group.durationSec.toFixed(2)),
      quality_score: qualityScore,
      state: overallState,
      note: noteStr,
      observation_count: group.observations.length,
      states: {
        input: inputState,
        output: outputState,
        cache_read: cacheReadState,
        cache_write: cacheWriteState,
        total: totalState,
        cost: costState,
        duration: durationState,
      },
    });
  }

  // Sort runs deterministically by task_id, run_id, condition
  aggregatedRuns.sort((a, b) => {
    if (a.task_id !== b.task_id) return a.task_id.localeCompare(b.task_id);
    if (a.run_id !== b.run_id) return a.run_id.localeCompare(b.run_id);
    return a.condition.localeCompare(b.condition);
  });

  // Calculate Totals
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheWrite = 0;
  let totalThinking = 0;
  let totalTokens = 0;
  let totalCost = 0;
  let totalDuration = 0;

  for (const r of aggregatedRuns) {
    totalInput += r.input_tokens;
    totalOutput += r.output_tokens;
    totalCacheRead += r.cache_read_tokens;
    totalCacheWrite += r.cache_write_tokens;
    totalThinking += r.thinking_tokens;
    totalTokens += r.total_tokens;
    totalCost += r.cost_usd;
    totalDuration += r.duration_s;
  }

  const overallCacheRatio = calculateCacheRatio(totalCacheRead, totalInput);

  // Rollup by condition
  function buildConditionSummary(cond: "with" | "without"): ConditionSummary | undefined {
    const subset = aggregatedRuns.filter((r) => r.condition === cond);
    if (subset.length === 0) return undefined;

    let inTok = 0;
    let outTok = 0;
    let crTok = 0;
    let cwTok = 0;
    let totTok = 0;
    let cost = 0;
    let dur = 0;

    for (const s of subset) {
      inTok += s.input_tokens;
      outTok += s.output_tokens;
      crTok += s.cache_read_tokens;
      cwTok += s.cache_write_tokens;
      totTok += s.total_tokens;
      cost += s.cost_usd;
      dur += s.duration_s;
    }

    const ratio = calculateCacheRatio(crTok, inTok);
    return {
      condition: cond,
      run_count: subset.length,
      total_tokens: totTok,
      mean_tokens: Math.round(totTok / subset.length),
      input_tokens: inTok,
      output_tokens: outTok,
      cache_read_tokens: crTok,
      cache_write_tokens: cwTok,
      cache_ratio: ratio,
      cost_usd: Number(cost.toFixed(4)),
      mean_cost_usd: Number((cost / subset.length).toFixed(4)),
      duration_s: Number(dur.toFixed(2)),
      mean_duration_s: Number((dur / subset.length).toFixed(2)),
    };
  }

  const withSummary = buildConditionSummary("with");
  const withoutSummary = buildConditionSummary("without");

  let delta:
    | {
        token_delta: number;
        token_savings_pct: number;
        cost_delta: number;
        duration_delta: number;
      }
    | undefined;

  if (withSummary && withoutSummary) {
    const tokenDelta = withSummary.total_tokens - withoutSummary.total_tokens;
    const savingsPct =
      withoutSummary.total_tokens > 0
        ? ((withoutSummary.total_tokens - withSummary.total_tokens) /
            withoutSummary.total_tokens) *
          100
        : 0;

    delta = {
      token_delta: tokenDelta,
      token_savings_pct: Number(savingsPct.toFixed(2)),
      cost_delta: Number((withSummary.cost_usd - withoutSummary.cost_usd).toFixed(4)),
      duration_delta: Number((withSummary.duration_s - withoutSummary.duration_s).toFixed(2)),
    };
  }

  // Rollup by task
  const byTask: Record<string, TaskSummary> = {};
  const taskGroups = new Map<string, AggregatedRun[]>();
  for (const r of aggregatedRuns) {
    let list = taskGroups.get(r.task_id);
    if (!list) {
      list = [];
      taskGroups.set(r.task_id, list);
    }
    list.push(r);
  }

  for (const [taskId, list] of taskGroups.entries()) {
    let taskIn = 0;
    let taskCr = 0;
    let taskTot = 0;
    let taskCost = 0;
    let taskDur = 0;
    let withTok = 0;
    let withoutTok = 0;
    let withRuns = 0;
    let withoutRuns = 0;

    for (const r of list) {
      taskIn += r.input_tokens;
      taskCr += r.cache_read_tokens;
      taskTot += r.total_tokens;
      taskCost += r.cost_usd;
      taskDur += r.duration_s;
      if (r.condition === "with") {
        withTok += r.total_tokens;
        withRuns++;
      } else {
        withoutTok += r.total_tokens;
        withoutRuns++;
      }
    }

    const savingsPct =
      withoutTok > 0 ? ((withoutTok - withTok) / withoutTok) * 100 : 0;

    byTask[taskId] = {
      task_id: taskId,
      runs: list.length,
      with_runs: withRuns,
      without_runs: withoutRuns,
      total_tokens: taskTot,
      with_tokens: withTok,
      without_tokens: withoutTok,
      token_savings_pct: Number(savingsPct.toFixed(2)),
      cache_ratio: calculateCacheRatio(taskCr, taskIn),
      cost_usd: Number(taskCost.toFixed(4)),
      duration_s: Number(taskDur.toFixed(2)),
    };
  }

  // Rollup by host
  const byHost: Record<string, HostSummary> = {};
  const hostGroups = new Map<string, AggregatedRun[]>();
  for (const r of aggregatedRuns) {
    let list = hostGroups.get(r.host);
    if (!list) {
      list = [];
      hostGroups.set(r.host, list);
    }
    list.push(r);
  }

  for (const [host, list] of hostGroups.entries()) {
    let hIn = 0;
    let hOut = 0;
    let hCr = 0;
    let hCw = 0;
    let hTot = 0;
    let hCost = 0;
    let hDur = 0;

    for (const r of list) {
      hIn += r.input_tokens;
      hOut += r.output_tokens;
      hCr += r.cache_read_tokens;
      hCw += r.cache_write_tokens;
      hTot += r.total_tokens;
      hCost += r.cost_usd;
      hDur += r.duration_s;
    }

    byHost[host] = {
      host,
      run_count: list.length,
      input_tokens: hIn,
      output_tokens: hOut,
      cache_read_tokens: hCr,
      cache_write_tokens: hCw,
      total_tokens: hTot,
      cache_ratio: calculateCacheRatio(hCr, hIn),
      cost_usd: Number(hCost.toFixed(4)),
      duration_s: Number(hDur.toFixed(2)),
    };
  }

  // Rollup by epic
  const byEpic: Record<string, EpicSummary> = {};
  const epicGroups = new Map<string, AggregatedRun[]>();
  for (const r of aggregatedRuns) {
    let list = epicGroups.get(r.epic_id);
    if (!list) {
      list = [];
      epicGroups.set(r.epic_id, list);
    }
    list.push(r);
  }

  for (const [epicId, list] of epicGroups.entries()) {
    let eIn = 0;
    let eCr = 0;
    let eTot = 0;
    let eCost = 0;
    let eDur = 0;

    for (const r of list) {
      eIn += r.input_tokens;
      eCr += r.cache_read_tokens;
      eTot += r.total_tokens;
      eCost += r.cost_usd;
      eDur += r.duration_s;
    }

    byEpic[epicId] = {
      epic_id: epicId,
      run_count: list.length,
      total_tokens: eTot,
      cache_ratio: calculateCacheRatio(eCr, eIn),
      cost_usd: Number(eCost.toFixed(4)),
      duration_s: Number(eDur.toFixed(2)),
    };
  }

  return {
    generated_at: generatedAt,
    total_runs: aggregatedRuns.length,
    total_observations: records.length,
    runs: aggregatedRuns,
    totals: {
      input_tokens: totalInput,
      output_tokens: totalOutput,
      cache_read_tokens: totalCacheRead,
      cache_write_tokens: totalCacheWrite,
      thinking_tokens: totalThinking,
      total_tokens: totalTokens,
      cache_ratio: overallCacheRatio,
      cost_usd: Number(totalCost.toFixed(4)),
      duration_s: Number(totalDuration.toFixed(2)),
    },
    by_condition: {
      with: withSummary,
      without: withoutSummary,
      delta,
    },
    by_task: byTask,
    by_host: byHost,
    by_epic: byEpic,
  };
}

/**
 * Formats Markdown summary tables for records/usage-summary.md.
 */
export function formatMarkdownSummary(result: AggregationResult): string {
  const lines: string[] = [];

  lines.push("# Continuous Usage Telemetry Summary");
  lines.push("");
  lines.push(`- Generated: \`${result.generated_at}\``);
  lines.push(`- Total runs aggregated: **${result.total_runs}** (across ${result.total_observations} raw observations)`);
  lines.push(`- Total token footprint: **${result.totals.total_tokens.toLocaleString()}** tokens`);
  lines.push(`- Overall cache hit ratio: **${(result.totals.cache_ratio * 100).toFixed(1)}%**`);
  if (result.totals.cost_usd > 0) {
    lines.push(`- Estimated cost: **$${result.totals.cost_usd.toFixed(4)} USD**`);
  }
  lines.push("");

  // Condition Comparison Table
  lines.push("## Condition Comparison (with vs without)");
  lines.push("");
  lines.push("| Condition | Runs | Total Tokens | Mean Tokens | Cache Hit Ratio | Cost (USD) | Mean Duration |");
  lines.push("|---|---|---|---|---|---|---|");

  const w = result.by_condition.with;
  const wo = result.by_condition.without;

  if (w) {
    lines.push(
      `| \`with\` | ${w.run_count} | ${w.total_tokens.toLocaleString()} | ${w.mean_tokens.toLocaleString()} | ${(w.cache_ratio * 100).toFixed(1)}% | $${w.cost_usd.toFixed(4)} | ${w.mean_duration_s.toFixed(1)}s |`
    );
  }
  if (wo) {
    lines.push(
      `| \`without\` | ${wo.run_count} | ${wo.total_tokens.toLocaleString()} | ${wo.mean_tokens.toLocaleString()} | ${(wo.cache_ratio * 100).toFixed(1)}% | $${wo.cost_usd.toFixed(4)} | ${wo.mean_duration_s.toFixed(1)}s |`
    );
  }
  if (result.by_condition.delta && w && wo) {
    const d = result.by_condition.delta;
    const sign = d.token_delta <= 0 ? "" : "+";
    const savingsStr = `${sign}${d.token_delta.toLocaleString()} (${d.token_savings_pct >= 0 ? "+" : ""}${d.token_savings_pct.toFixed(1)}% savings)`;
    const costSign = d.cost_delta <= 0 ? "" : "+";
    const durSign = d.duration_delta <= 0 ? "" : "+";
    lines.push(
      `| **Delta** | — | **${savingsStr}** | — | — | ${costSign}$${d.cost_delta.toFixed(4)} | ${durSign}${d.duration_delta.toFixed(1)}s |`
    );
  }
  if (!w && !wo) {
    lines.push("| *No runs recorded* | 0 | 0 | 0 | 0.0% | $0.0000 | 0.0s |");
  }
  lines.push("");

  // Task Breakdown Table
  lines.push("## Task Breakdown");
  lines.push("");
  lines.push("| Task ID | Runs | With Tok | Without Tok | Savings | Cache Hit Ratio | Cost (USD) | Duration |");
  lines.push("|---|---|---|---|---|---|---|---|");

  const tasks = Object.values(result.by_task);
  if (tasks.length > 0) {
    for (const t of tasks) {
      const savingsStr =
        t.without_runs > 0 && t.with_runs > 0 ? `${t.token_savings_pct.toFixed(1)}%` : "—";
      lines.push(
        `| \`${t.task_id}\` | ${t.runs} | ${t.with_tokens > 0 ? t.with_tokens.toLocaleString() : "—"} | ${t.without_tokens > 0 ? t.without_tokens.toLocaleString() : "—"} | ${savingsStr} | ${(t.cache_ratio * 100).toFixed(1)}% | $${t.cost_usd.toFixed(4)} | ${t.duration_s.toFixed(1)}s |`
      );
    }
  } else {
    lines.push("| *None* | 0 | — | — | — | 0.0% | $0.0000 | 0.0s |");
  }
  lines.push("");

  // Host Distribution Table
  lines.push("## Host Distribution");
  lines.push("");
  lines.push("| Host | Runs | Total Tokens | Input | Output | Cache Read | Cache Ratio | Cost (USD) |");
  lines.push("|---|---|---|---|---|---|---|---|");

  const hosts = Object.values(result.by_host);
  if (hosts.length > 0) {
    for (const h of hosts) {
      lines.push(
        `| \`${h.host}\` | ${h.run_count} | ${h.total_tokens.toLocaleString()} | ${h.input_tokens.toLocaleString()} | ${h.output_tokens.toLocaleString()} | ${h.cache_read_tokens.toLocaleString()} | ${(h.cache_ratio * 100).toFixed(1)}% | $${h.cost_usd.toFixed(4)} |`
      );
    }
  } else {
    lines.push("| *None* | 0 | 0 | 0 | 0 | 0 | 0.0% | $0.0000 |");
  }
  lines.push("");

  // Detailed Aggregated Runs Table
  lines.push("## Aggregated Run Details");
  lines.push("");
  lines.push("| Run ID | Task ID | Host | Arm | Total Tokens | Cache Ratio | Cost | Duration | Score | State |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");

  if (result.runs.length > 0) {
    for (const r of result.runs) {
      const costStr = r.states.cost === "unsupported" ? "`unsupported`" : `$${r.cost_usd.toFixed(4)}`;
      lines.push(
        `| \`${r.run_id}\` | \`${r.task_id}\` | \`${r.host}\` | \`${r.condition}\` | ${r.total_tokens.toLocaleString()} | ${(r.cache_ratio * 100).toFixed(1)}% | ${costStr} | ${r.duration_s.toFixed(1)}s | ${r.quality_score} | \`${r.state}\` |`
      );
    }
  } else {
    lines.push("| *None* | — | — | — | 0 | 0.0% | — | 0.0s | — | — |");
  }
  lines.push("");

  return lines.join("\n");
}

export const TSV_HEADER =
  "timestamp\trun_id\ttask_id\tepic_id\thost\tmodel\tcondition\tinput_tokens\toutput_tokens\tcache_read_tokens\tcache_write_tokens\ttotal_tokens\tcache_ratio\tcost_usd\tduration_s\tquality_score\tstate\tnote";

/**
 * Formats aggregated runs into TSV rows adhering strictly to the TSV_HEADER schema
 * and ADR 0006 honest reporting taxonomy.
 */
export function formatLedgerRows(result: AggregationResult): string {
  const rows: string[] = [];

  for (const r of result.runs) {
    const sanitizeTsvCol = (val: any) =>
      String(val ?? "")
        .replace(/\t/g, " ")
        .replace(/[\r\n]+/g, " ")
        .trim();

    // Input tokens
    const inCol =
      r.states.input === "absent" || r.states.input === "unsupported"
        ? r.states.input
        : String(r.input_tokens);

    // Output tokens
    const outCol =
      r.states.output === "absent" || r.states.output === "unsupported"
        ? r.states.output
        : String(r.output_tokens);

    // Cache read
    const crCol =
      r.states.cache_read === "absent" || r.states.cache_read === "unsupported"
        ? r.states.cache_read
        : String(r.cache_read_tokens);

    // Cache write
    const cwCol =
      r.states.cache_write === "absent" || r.states.cache_write === "unsupported"
        ? r.states.cache_write
        : String(r.cache_write_tokens);

    // Total tokens
    const totCol =
      r.states.total === "absent" || r.states.total === "unsupported"
        ? r.states.total
        : String(r.total_tokens);

    // Cache ratio
    const ratioCol =
      r.states.cache_read === "unsupported"
        ? "unsupported"
        : r.states.cache_read === "absent" && r.cache_read_tokens === 0
        ? "absent"
        : r.cache_ratio.toFixed(4);

    // Cost USD
    const costCol =
      r.states.cost === "unsupported" || r.states.cost === "absent"
        ? r.states.cost
        : r.cost_usd.toFixed(4);

    // Duration
    const durCol = r.states.duration === "absent" ? "absent" : r.duration_s.toFixed(1);

    // Quality Score
    const qCol =
      typeof r.quality_score === "number"
        ? r.quality_score.toFixed(2)
        : sanitizeTsvCol(r.quality_score) || "-";

    const noteCol = sanitizeTsvCol(r.note) || "-";

    const cols = [
      sanitizeTsvCol(r.timestamp),
      sanitizeTsvCol(r.run_id),
      sanitizeTsvCol(r.task_id),
      sanitizeTsvCol(r.epic_id),
      sanitizeTsvCol(r.host),
      sanitizeTsvCol(r.model),
      sanitizeTsvCol(r.condition),
      inCol,
      outCol,
      crCol,
      cwCol,
      totCol,
      ratioCol,
      costCol,
      durCol,
      qCol,
      sanitizeTsvCol(r.state),
      noteCol,
    ];

    rows.push(cols.join("\t"));
  }

  return rows.length > 0 ? rows.join("\n") + "\n" : "";
}

/**
 * Appends runs to records/usage-ledger.tsv (or specified path), creating file with
 * header if not yet present.
 */
export async function appendLedger(
  ledgerPath: string,
  rowsOrResult: string | AggregationResult
): Promise<void> {
  const resolved = path.resolve(ledgerPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });

  let exists = false;
  try {
    const stat = await fs.stat(resolved);
    exists = stat.size > 0;
  } catch {
    exists = false;
  }

  let contentToAppend = "";
  if (!exists) {
    contentToAppend += TSV_HEADER + "\n";
  }

  if (typeof rowsOrResult === "string") {
    contentToAppend += rowsOrResult;
  } else {
    contentToAppend += formatLedgerRows(rowsOrResult);
  }

  if (contentToAppend) {
    await fs.appendFile(resolved, contentToAppend, "utf8");
  }
}

/**
 * Parses command line arguments.
 */
export function parseCliArgs(args: string[]): CliOptions {
  let inPath: string | undefined;
  let outPath = "records/usage-summary.md";
  let jsonPath: string | undefined;
  let emitJson = false;
  let ledgerPath: string | undefined;
  let appendLedgerFlag = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--in" && i + 1 < args.length) {
      inPath = args[++i];
    } else if (arg === "--out" && i + 1 < args.length) {
      outPath = args[++i];
    } else if (arg === "--json") {
      emitJson = true;
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        jsonPath = args[++i];
      }
    } else if (arg === "--ledger") {
      appendLedgerFlag = true;
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        ledgerPath = args[++i];
      } else {
        ledgerPath = "records/usage-ledger.tsv";
      }
    }
  }

  return { inPath, outPath, jsonPath, emitJson, ledgerPath, appendLedgerFlag };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  bun tools/eval/aggregate_usage.ts [options]

Options:
  --in <path|-stdin>   Input file, directory of .jsonl, or -stdin (default: records/usage)
  --out <path>         Output Markdown summary file (default: records/usage-summary.md)
  --json [path]        Emit structured JSON summary to stdout or file
  --ledger [path]      Append aggregated runs to TSV ledger (default: records/usage-ledger.tsv)
  --help, -h           Show this help message
`);
    process.exit(0);
  }

  try {
    const options = parseCliArgs(args);

    let effectiveInPath = options.inPath;
    if (!effectiveInPath) {
      if (!process.stdin.isTTY) {
        effectiveInPath = "-stdin";
      } else {
        try {
          const s = await fs.stat(path.resolve("records/usage"));
          if (s.isDirectory()) {
            effectiveInPath = "records/usage";
          }
        } catch {
          // not found
        }
      }
    }

    if (!effectiveInPath) {
      console.error("Error: Missing input. Provide --in <path|-stdin> or pipe records via stdin.");
      process.exit(1);
    }

    const records = await loadRecordsFromPath(effectiveInPath);
    const result = aggregateUsage(records);

    // 1. Output Markdown summary
    const md = formatMarkdownSummary(result);
    const resolvedOut = path.resolve(options.outPath);
    await fs.mkdir(path.dirname(resolvedOut), { recursive: true });
    await fs.writeFile(resolvedOut, md, "utf8");

    // 2. Append to ledger if requested
    if (options.appendLedgerFlag && options.ledgerPath) {
      await appendLedger(options.ledgerPath, result);
    }

    // 3. Emit JSON if requested
    if (options.emitJson) {
      const jsonStr = JSON.stringify(result, null, 2);
      if (options.jsonPath) {
        const resolvedJson = path.resolve(options.jsonPath);
        await fs.mkdir(path.dirname(resolvedJson), { recursive: true });
        await fs.writeFile(resolvedJson, jsonStr + "\n", "utf8");
      } else {
        console.log(jsonStr);
      }
    }

    if (!options.emitJson || options.jsonPath) {
      console.log(
        `Aggregated ${result.total_runs} runs (${result.total_observations} observations). Summary written to ${options.outPath}`
      );
    }
  } catch (err: any) {
    console.error(`Error: ${err?.message || err}`);
    process.exit(1);
  }
}
