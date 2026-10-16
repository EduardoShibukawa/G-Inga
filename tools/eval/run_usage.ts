/**
 * tools/eval/run_usage.ts
 *
 * Multi-host local usage telemetry runner, parser CLI, and Antigravity hook ingestor.
 * Normalizes telemetry from Claude Code (OTel), Antigravity (transcripts/envelopes),
 * and OpenCode (CLI JSON / session export / stats) into normalized UsageObservation JSONL records.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  sanitizeText,
  parseAntigravityJson,
  parseAntigravityTranscript,
  parseClaudeCodeOtel,
  parseOpencodeJson,
  type UsageObservation,
  type MeasureState,
} from "./collect_usage";

export interface TelemetryRecord extends UsageObservation {
  task_id: string;
  condition: "with" | "without";
  timestamp: string;
  observation?: UsageObservation;
}

export interface RunUsageOptions {
  host: "claude-code" | "antigravity" | "opencode";
  inFile?: string;
  inputContent?: string;
  taskId?: string;
  condition?: "with" | "without";
  outFile?: string;
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function parseCliArgs(args: string[]): RunUsageOptions {
  let host: "claude-code" | "antigravity" | "opencode" | undefined;
  let inFile: string | undefined;
  let taskId = "continuous";
  let condition: "with" | "without" = "with";
  let outFile: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--host" && i + 1 < args.length) {
      const h = args[++i].toLowerCase();
      if (h === "claude-code" || h === "antigravity" || h === "opencode") {
        host = h as "claude-code" | "antigravity" | "opencode";
      } else {
        throw new Error(`Unsupported host: ${h}. Must be claude-code, antigravity, or opencode.`);
      }
    } else if (arg === "--in" && i + 1 < args.length) {
      inFile = args[++i];
    } else if (arg === "--task-id" && i + 1 < args.length) {
      taskId = args[++i];
    } else if (arg === "--condition" && i + 1 < args.length) {
      const c = args[++i].toLowerCase();
      if (c === "with" || c === "without") {
        condition = c as "with" | "without";
      } else {
        throw new Error(`Invalid condition: ${c}. Expected 'with' or 'without'.`);
      }
    } else if (arg === "--out" && i + 1 < args.length) {
      outFile = args[++i];
    } else if (arg === "--stdin-hook") {
      inFile = "-stdin";
    }
  }

  if (!host) {
    throw new Error("Missing required flag: --host <claude-code|antigravity|opencode>");
  }

  return { host, inFile, taskId, condition, outFile };
}

export async function runUsage(options: RunUsageOptions): Promise<TelemetryRecord> {
  const { host, inFile, taskId = "continuous", condition = "with", outFile } = options;

  let content = options.inputContent;
  if (content === undefined) {
    if (!inFile) {
      throw new Error("Missing input: either provide --in <file|-stdin> or inputContent.");
    }
    if (inFile === "-stdin" || inFile === "-" || inFile === "--stdin" || inFile === "/dev/stdin") {
      content = await readStdin();
    } else {
      content = await fs.readFile(inFile, "utf8");
    }
  }

  let obs: UsageObservation;

  if (host === "antigravity") {
    let hookContext: any = null;
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const candidate = JSON.parse(trimmed);
        if (candidate && (candidate.transcriptPath || candidate.conversationId)) {
          hookContext = candidate;
        }
      } catch {
        // Not a single JSON object
      }
    }

    if (hookContext && hookContext.transcriptPath) {
      try {
        const transcriptRaw = await fs.readFile(hookContext.transcriptPath, "utf8");
        obs = parseAntigravityTranscript(transcriptRaw);
      } catch (err) {
        obs = {
          host: "antigravity",
          scope_id: hookContext.conversationId ? sanitizeText(hookContext.conversationId) : undefined,
          input_tokens: { state: "collection_error", note: `Could not read transcriptPath: ${err}` },
          output_tokens: { state: "collection_error" },
          cache_read_tokens: { state: "collection_error" },
          cache_write_tokens: { state: "unsupported" },
          thinking_tokens: { state: "collection_error" },
          total_tokens: { state: "collection_error" },
          wall_duration_seconds: { state: "collection_error" },
          cost_usd_estimate: { state: "unsupported", note: "flat subscription / no list price emitted" },
          rate_limit_5h_used_pct: { state: "unsupported" },
          rate_limit_7d_used_pct: { state: "unsupported" },
        };
      }
      if (hookContext.conversationId && (!obs.scope_id || obs.scope_id === "")) {
        obs.scope_id = sanitizeText(hookContext.conversationId);
      }
    } else {
      // Check if it's headless JSON envelope or transcript
      if (trimmed.startsWith("{") && trimmed.endsWith("}") && !trimmed.includes("\n")) {
        try {
          const candidate = JSON.parse(trimmed);
          if (candidate.usage) {
            obs = parseAntigravityJson(trimmed);
          } else {
            obs = parseAntigravityTranscript(content);
          }
        } catch {
          obs = parseAntigravityTranscript(content);
        }
      } else {
        obs = parseAntigravityTranscript(content);
      }
    }
  } else if (host === "claude-code") {
    obs = parseClaudeCodeOtel(content);
  } else if (host === "opencode") {
    obs = parseOpencodeJson(content);
  } else {
    throw new Error(`Unsupported host: ${host}`);
  }

  // Ensure scope_id is sanitized if present
  if (obs.scope_id) {
    obs.scope_id = sanitizeText(obs.scope_id);
  }

  const record: TelemetryRecord = {
    ...obs,
    task_id: sanitizeText(taskId),
    condition,
    timestamp: new Date().toISOString(),
    observation: { ...obs },
  };

  if (outFile) {
    const resolvedOut = path.resolve(outFile);
    await fs.mkdir(path.dirname(resolvedOut), { recursive: true });
    await fs.appendFile(resolvedOut, JSON.stringify(record) + "\n", "utf8");
  }

  return record;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`Usage:
  bun tools/eval/run_usage.ts --host <claude-code|antigravity|opencode> --in <file|-stdin> [options]

Options:
  --host <name>       Agent host (claude-code, antigravity, or opencode) [required]
  --in <path>         Input log/transcript file or -stdin / - for standard input [required]
  --task-id <id>      Task identifier (default: continuous)
  --condition <cond>  Condition arm: with or without (default: with)
  --out <path>        Output JSONL file to append to (default: stdout)
  --stdin-hook        Alias for --in -stdin
`);
    process.exit(0);
  }

  try {
    const options = parseCliArgs(args);
    const record = await runUsage(options);
    if (!options.outFile) {
      console.log(JSON.stringify(record));
    }
  } catch (err: any) {
    console.error(`Error: ${err?.message || err}`);
    process.exit(1);
  }
}
