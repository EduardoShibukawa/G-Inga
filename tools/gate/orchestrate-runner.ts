#!/usr/bin/env bun
/**
 * Autonomous Orchestration Wave Runner for G-Ingá (EXP-05 / EXP-06 Integration).
 *
 * Orchestrates multi-ticket execution batches:
 * 1. Parses declared ticket batches and scopes from JSON, CLI, or files.
 * 2. Partitions tickets into sequential conflict-free execution waves via partitionWaves.
 * 3. Executes workers of the same wave concurrently in isolated Git worktrees.
 * 4. Measures and validates token budgets per ticket and aggregate batch via token_budget_guard.
 * 5. Provides programmatic APIs and a rich CLI.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { partitionWaves, detectScopeCollisions } from "./verify-gate";
import {
  createWorktree,
  runInWorktree,
  removeWorktree,
  getWorktreeDiff,
  type WorktreeInstance,
} from "./worktree-runner";
import {
  evaluateTokenBudget,
  normalizeTranscriptTelemetry,
  detectActionLoop,
  DEFAULT_BUDGET_LIMITS,
  type TokenMetrics,
  type CeremonyTier,
  type TokenBudgetEvaluation,
} from "../eval/token_budget_guard";

export { partitionWaves };

export interface OrchestrationTicket {
  id: string;
  scope: string[];
  command?: string;
  branch?: string;
  ceremony?: CeremonyTier;
  transcriptLines?: string[];
  tokens?: number;
}

export interface WorkerExecutionResult {
  ticketId: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  setupTimeMs?: number;
  diff?: string;
  tokenEvaluation?: TokenBudgetEvaluation;
  error?: string;
}

export interface WaveExecutionResult {
  waveIndex: number;
  ticketIds: string[];
  workers: WorkerExecutionResult[];
  success: boolean;
  durationMs: number;
}

export interface OrchestrationBatchOptions {
  tickets: OrchestrationTicket[];
  repoDir?: string;
  dryRun?: boolean;
  ceremony?: CeremonyTier;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface OrchestrationBatchResult {
  success: boolean;
  waves: string[][];
  waveResults: WaveExecutionResult[];
  totalTickets: number;
  totalTokens: number;
  totalDurationMs: number;
  tokenEvaluation: TokenBudgetEvaluation;
  summary: string;
}

/**
 * Normalizes input from various JSON formats into OrchestrationTicket array.
 */
export function parseTicketsInput(rawInput: any): OrchestrationTicket[] {
  let parsed = rawInput;

  if (typeof rawInput === "string") {
    const trimmed = rawInput.trim();
    if (existsSync(trimmed)) {
      try {
        const fileContent = readFileSync(trimmed, "utf8");
        parsed = JSON.parse(fileContent);
      } catch (err: any) {
        throw new Error(`Failed to read or parse tickets file "${trimmed}": ${err.message}`);
      }
    } else {
      try {
        parsed = JSON.parse(trimmed);
      } catch (err: any) {
        throw new Error(`Failed to parse tickets JSON string: ${err.message}`);
      }
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return [];
  }

  // Handle wrapped object { tickets: [...] }
  if (Array.isArray(parsed.tickets)) {
    parsed = parsed.tickets;
  }

  // Array of tickets or ticket-like objects
  if (Array.isArray(parsed)) {
    return parsed.map((item, idx) => {
      if (typeof item === "string") {
        return { id: item, scope: [] };
      }
      const id = String(item.id || item.name || `worker-${idx + 1}`);
      const rawScope = item.scope || item.scopes || [];
      const scope = Array.isArray(rawScope)
        ? rawScope.map(String)
        : typeof rawScope === "string"
        ? [rawScope]
        : [];
      return {
        id,
        scope,
        command: item.command,
        branch: item.branch,
        ceremony: item.ceremony,
        transcriptLines: item.transcriptLines,
        tokens: typeof item.tokens === "number" ? item.tokens : undefined,
      };
    });
  }

  // Record / dictionary format
  const tickets: OrchestrationTicket[] = [];
  for (const [key, val] of Object.entries(parsed)) {
    if (Array.isArray(val)) {
      tickets.push({
        id: key,
        scope: val.map(String),
      });
    } else if (val && typeof val === "object") {
      const v = val as any;
      const rawScope = v.scope || v.scopes || [];
      const scope = Array.isArray(rawScope)
        ? rawScope.map(String)
        : typeof rawScope === "string"
        ? [rawScope]
        : [];
      tickets.push({
        id: key,
        scope,
        command: v.command,
        branch: v.branch,
        ceremony: v.ceremony,
        transcriptLines: v.transcriptLines,
        tokens: typeof v.tokens === "number" ? v.tokens : undefined,
      });
    } else {
      tickets.push({
        id: key,
        scope: [],
      });
    }
  }

  return tickets;
}

/**
 * Partitions tickets into conflict-free waves based on declared scopes.
 */
export function partitionTicketsIntoWaves(tickets: OrchestrationTicket[]): OrchestrationTicket[][] {
  const declaredScopes: Record<string, string[]> = {};
  const ticketMap = new Map<string, OrchestrationTicket>();

  for (const t of tickets) {
    declaredScopes[t.id] = t.scope || [];
    ticketMap.set(t.id, t);
  }

  const waveIdGroups = partitionWaves(declaredScopes);
  return waveIdGroups.map((group) =>
    group.map((id) => ticketMap.get(id) || { id, scope: declaredScopes[id] || [] })
  );
}

/**
 * Evaluates the token budget for a single ticket.
 */
export function evaluateTicketBudget(
  ticket: OrchestrationTicket,
  ceremony: CeremonyTier = "standard",
  verifiedSuccess = true
): TokenBudgetEvaluation {
  const targetCeremony = ticket.ceremony || ceremony;

  if (ticket.transcriptLines && ticket.transcriptLines.length > 0) {
    const { host, metrics, actions } = normalizeTranscriptTelemetry(ticket.transcriptLines);
    const loopResult = detectActionLoop(actions);
    return evaluateTokenBudget(metrics, targetCeremony, loopResult, verifiedSuccess, host);
  }

  const tokenCount = ticket.tokens || 0;
  const metrics: TokenMetrics = {
    tokens_input: tokenCount,
    tokens_output: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    total_tokens: tokenCount,
    cache_read_ratio: 0,
  };

  return evaluateTokenBudget(metrics, targetCeremony, { detected: false }, verifiedSuccess);
}

/**
 * Evaluates aggregate token budget for a full batch.
 */
export function evaluateBatchBudget(
  totalTokens: number,
  ceremony: CeremonyTier = "standard",
  verifiedSuccess = true,
  maxTokensOverride?: number
): TokenBudgetEvaluation {
  const metrics: TokenMetrics = {
    tokens_input: totalTokens,
    tokens_output: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    total_tokens: totalTokens,
    cache_read_ratio: 0,
  };

  const evalResult = evaluateTokenBudget(metrics, ceremony, { detected: false }, verifiedSuccess);

  // If a custom maxTokens ceiling override is provided and exceeded
  if (maxTokensOverride !== undefined && totalTokens > maxTokensOverride) {
    return {
      ...evalResult,
      budget_ceiling: maxTokensOverride,
      budget_usage_pct: Number(((totalTokens / maxTokensOverride) * 100).toFixed(2)),
      verdict: "fail",
      reason: `Total batch tokens (${totalTokens}) exceeded custom limit (${maxTokensOverride})`,
    };
  }

  return evalResult;
}

/**
 * Executes a single worker in an ephemeral Git worktree sandbox.
 */
export async function executeWorker(
  ticket: OrchestrationTicket,
  options: OrchestrationBatchOptions
): Promise<WorkerExecutionResult> {
  const startTime = performance.now();
  const repoDir = resolve(options.repoDir || process.cwd());
  const ceremony = ticket.ceremony || options.ceremony || "standard";

  if (options.dryRun) {
    const tokenEval = evaluateTicketBudget(ticket, ceremony, true);
    return {
      ticketId: ticket.id,
      success: true,
      exitCode: 0,
      stdout: `[dry-run] simulated worker ${ticket.id}`,
      stderr: "",
      durationMs: Number((performance.now() - startTime).toFixed(2)),
      tokenEvaluation: tokenEval,
    };
  }

  let worktree: WorktreeInstance | null = null;
  try {
    worktree = createWorktree({
      repoDir,
      branch: ticket.branch,
      detach: !ticket.branch,
    });

    const execResult = runInWorktree(worktree, {
      command: ticket.command || "git status",
      timeoutMs: options.timeoutMs,
    });

    const diff = getWorktreeDiff(worktree);
    const success = execResult.exitCode === 0;
    const tokenEval = evaluateTicketBudget(ticket, ceremony, success);

    return {
      ticketId: ticket.id,
      success,
      exitCode: execResult.exitCode,
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      durationMs: Number((performance.now() - startTime).toFixed(2)),
      setupTimeMs: Number(worktree.setupTimeMs.toFixed(2)),
      diff,
      tokenEvaluation: tokenEval,
    };
  } catch (err: any) {
    const tokenEval = evaluateTicketBudget(ticket, ceremony, false);
    return {
      ticketId: ticket.id,
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: err.message || String(err),
      durationMs: Number((performance.now() - startTime).toFixed(2)),
      error: err.message || String(err),
      tokenEvaluation: tokenEval,
    };
  } finally {
    if (worktree) {
      removeWorktree(worktree, true);
    }
  }
}

/**
 * Executes all tickets within a single wave concurrently.
 */
export async function executeWave(
  waveTickets: OrchestrationTicket[],
  options: OrchestrationBatchOptions,
  waveIndex: number
): Promise<WaveExecutionResult> {
  const startTime = performance.now();
  const ticketIds = waveTickets.map((t) => t.id);

  // Execute all workers in the wave concurrently
  const workers = await Promise.all(
    waveTickets.map((ticket) => executeWorker(ticket, options))
  );

  const allPassed = workers.every((w) => w.success && w.tokenEvaluation?.verdict !== "fail");
  const durationMs = Number((performance.now() - startTime).toFixed(2));

  return {
    waveIndex,
    ticketIds,
    workers,
    success: allPassed,
    durationMs,
  };
}

/**
 * Main orchestration runner entry point.
 */
export async function runOrchestrationBatch(
  options: OrchestrationBatchOptions
): Promise<OrchestrationBatchResult> {
  const startTime = performance.now();
  const tickets = options.tickets || [];
  const ceremony = options.ceremony || "standard";

  if (tickets.length === 0) {
    const emptyEval = evaluateBatchBudget(0, ceremony, true, options.maxTokens);
    return {
      success: true,
      waves: [],
      waveResults: [],
      totalTickets: 0,
      totalTokens: 0,
      totalDurationMs: 0,
      tokenEvaluation: emptyEval,
      summary: "Empty batch: 0 tickets.",
    };
  }

  // 1. Partition into waves
  const waveTicketGroups = partitionTicketsIntoWaves(tickets);
  const waveIdGroups = waveTicketGroups.map((group) => group.map((t) => t.id));

  // 2. Sequentially execute each wave (with workers inside each wave running concurrently)
  const waveResults: WaveExecutionResult[] = [];
  let allWavesPassed = true;

  for (let i = 0; i < waveTicketGroups.length; i++) {
    const waveTickets = waveTicketGroups[i];
    const waveResult = await executeWave(waveTickets, options, i + 1);
    waveResults.push(waveResult);

    if (!waveResult.success) {
      allWavesPassed = false;
      // Stop further wave execution on failure to preserve circuit breaker semantics
      break;
    }
  }

  // 3. Compute token accounting across all executed workers
  let totalTokens = 0;
  for (const wr of waveResults) {
    for (const w of wr.workers) {
      if (w.tokenEvaluation) {
        totalTokens += w.tokenEvaluation.metrics.total_tokens;
      }
    }
  }

  const batchTokenEval = evaluateBatchBudget(
    totalTokens,
    ceremony,
    allWavesPassed,
    options.maxTokens
  );

  const batchSuccess = allWavesPassed && batchTokenEval.verdict !== "fail";
  const totalDurationMs = Number((performance.now() - startTime).toFixed(2));

  const summary = [
    `Orchestration Batch Summary:`,
    `- Total Tickets: ${tickets.length}`,
    `- Execution Waves: ${waveTicketGroups.length}`,
    `- Status: ${batchSuccess ? "PASS" : "FAIL"}`,
    `- Total Duration: ${totalDurationMs}ms`,
    `- Token Consumption: ${totalTokens} / ${batchTokenEval.budget_ceiling} tokens (${batchTokenEval.budget_usage_pct}%)`,
    `- Token Verdict: ${batchTokenEval.verdict.toUpperCase()} (${batchTokenEval.reason})`,
  ].join("\n");

  return {
    success: batchSuccess,
    waves: waveIdGroups,
    waveResults,
    totalTickets: tickets.length,
    totalTokens,
    totalDurationMs,
    tokenEvaluation: batchTokenEval,
    summary,
  };
}

/**
 * CLI parser and execution runner.
 */
export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = argv;
  let batchInput: string | null = null;
  let repoDir = process.cwd();
  let ceremony: CeremonyTier = "standard";
  let dryRun = false;
  let maxTokens: number | undefined;
  let jsonOutput = false;
  let timeoutMs = 60000;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--batch" || arg === "--tickets" || arg === "--declared-scopes" || arg === "--scopes") {
      batchInput = args[i + 1] || null;
      i++;
    } else if (arg === "--repo" && args[i + 1]) {
      repoDir = args[i + 1];
      i++;
    } else if (arg === "--ceremony" && args[i + 1]) {
      const c = args[i + 1].toLowerCase();
      if (c === "light" || c === "standard" || c === "heavy") {
        ceremony = c as CeremonyTier;
      }
      i++;
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--max-tokens" && args[i + 1]) {
      maxTokens = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--timeout-ms" && args[i + 1]) {
      timeoutMs = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
G-Ingá Autonomous OODA Orchestration Wave Runner

Usage:
  bun tools/gate/orchestrate-runner.ts --batch <file|json> [options]

Options:
  --batch, --tickets, --declared-scopes <input>  JSON string or path to JSON file
  --repo <dir>                                    Target Git repository (default: cwd)
  --ceremony <light|standard|heavy>               Ceremony tier budget (default: standard)
  --dry-run                                       Simulate worker execution without worktrees
  --max-tokens <num>                              Override token ceiling limit
  --timeout-ms <num>                              Worker execution timeout in ms (default: 60000)
  --json                                          Output structured JSON result
  --help, -h                                      Show this help
`);
      return 0;
    }
  }

  if (!batchInput) {
    console.error(`[Orchestrate Runner] Error: missing required --batch or --declared-scopes argument.`);
    return 1;
  }

  let tickets: OrchestrationTicket[];
  try {
    tickets = parseTicketsInput(batchInput);
  } catch (err: any) {
    console.error(`[Orchestrate Runner] Input Error: ${err.message}`);
    return 1;
  }

  const result = await runOrchestrationBatch({
    tickets,
    repoDir,
    dryRun,
    ceremony,
    maxTokens,
    timeoutMs,
  });

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return result.success ? 0 : 1;
  }

  console.log(`[OODA Orchestrate Runner] Loaded ${result.totalTickets} ticket(s)`);
  console.log(`[OODA Orchestrate Runner] Partitioned into ${result.waves.length} wave(s):`);
  result.waves.forEach((wave, idx) => {
    console.log(`  Wave ${idx + 1} (${wave.length} workers): [${wave.join(", ")}]`);
  });

  for (const wr of result.waveResults) {
    console.log(`\n[Wave ${wr.waveIndex}] ${wr.success ? "PASS" : "FAIL"} (${wr.durationMs}ms)`);
    for (const w of wr.workers) {
      const status = w.success ? "PASS" : "FAIL";
      const tokenMsg = w.tokenEvaluation
        ? `, tokens: ${w.tokenEvaluation.metrics.total_tokens}`
        : "";
      console.log(`  - ${w.ticketId}: ${status} (exit ${w.exitCode}, ${w.durationMs}ms${tokenMsg})`);
      if (w.error) {
        console.log(`    Error: ${w.error}`);
      }
    }
  }

  console.log(`\n${result.summary}`);

  if (result.tokenEvaluation.verdict === "warn") {
    console.warn(`\n[WARNING] Token drift warning: ${result.tokenEvaluation.reason}`);
  }

  return result.success ? 0 : 1;
}

if (import.meta.main) {
  runCli().then((code) => process.exit(code));
}
