import { describe, expect, test } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseCliArgs,
  runUsage,
  type TelemetryRecord,
} from "./run_usage";
import {
  parseOpencodeJson,
  parseAntigravityTranscript,
  parseAntigravityJson,
  parseClaudeCodeOtel,
  sanitizeText,
} from "./collect_usage";

describe("Multi-host telemetry ingestion (tools/eval/run_usage.ts)", () => {
  test("Claude Code OTel logs ingest into normalized TelemetryRecord", async () => {
    const otelLogs = [
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "input" },
        value: 2000,
      }),
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "output" },
        value: 500,
      }),
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "cacheRead" },
        value: 800,
      }),
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "cacheCreation" },
        value: 150,
      }),
      JSON.stringify({
        metric: "cost.usage",
        value: 0.052,
      }),
      JSON.stringify({
        metric: "active_time.total",
        value: 8500,
      }),
      JSON.stringify({
        sessionId: "11112222-3333-4444-5555-666677778888",
      }),
    ].join("\n");

    const record = await runUsage({
      host: "claude-code",
      inputContent: otelLogs,
      taskId: "test-task-01",
      condition: "with",
    });

    expect(record.host).toBe("claude-code");
    expect(record.task_id).toBe("test-task-01");
    expect(record.condition).toBe("with");
    expect(record.input_tokens.value).toBe(2000);
    expect(record.input_tokens.state).toBe("observed");
    expect(record.output_tokens.value).toBe(500);
    expect(record.output_tokens.state).toBe("observed");
    expect(record.cache_read_tokens.value).toBe(800);
    expect(record.cache_read_tokens.state).toBe("observed");
    expect(record.cache_write_tokens.value).toBe(150);
    expect(record.cache_write_tokens.state).toBe("observed");
    expect(record.total_tokens.value).toBe(3450); // 2000 + 500 + 800 + 150
    expect(record.total_tokens.state).toBe("derived");
    expect(record.cost_usd_estimate.value).toBe(0.052);
    expect(record.cost_usd_estimate.state).toBe("estimated");
    expect(record.wall_duration_seconds.value).toBe(8.5);
    expect(record.wall_duration_seconds.state).toBe("observed");
    expect(record.thinking_tokens.state).toBe("unsupported");
    expect(record.scope_id).toBe("[UUID]");
  });

  test("Antigravity headless JSON envelope ingests properly", async () => {
    const envelope = JSON.stringify({
      conversation_id: "test-conv-987",
      status: "SUCCESS",
      duration_seconds: 12.4,
      usage: {
        input_tokens: 3000,
        output_tokens: 600,
        cache_read_tokens: 1500,
        thinking_tokens: 250,
        total_tokens: 3600,
      },
    });

    const record = await runUsage({
      host: "antigravity",
      inputContent: envelope,
      taskId: "task-agy-env",
      condition: "with",
    });

    expect(record.host).toBe("antigravity");
    expect(record.input_tokens.value).toBe(3000);
    expect(record.input_tokens.state).toBe("observed");
    expect(record.output_tokens.value).toBe(600);
    expect(record.output_tokens.state).toBe("observed");
    expect(record.cache_read_tokens.value).toBe(1500);
    expect(record.cache_read_tokens.state).toBe("observed");
    expect(record.cache_write_tokens.state).toBe("unsupported");
    expect(record.thinking_tokens.value).toBe(250);
    expect(record.thinking_tokens.state).toBe("observed");
    expect(record.total_tokens.value).toBe(3600);
    expect(record.cost_usd_estimate.state).toBe("unsupported");
    expect(record.wall_duration_seconds.value).toBe(12.4);
    expect(record.wall_duration_seconds.state).toBe("observed");
  });

  test("Antigravity transcript JSONL steps accumulate tokens and timestamps", async () => {
    const transcript = [
      JSON.stringify({
        step_index: 1,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        created_at: "2026-10-16T12:00:00.000Z",
        input_tokens: 1000,
        cache_read_tokens: 400,
        output_tokens: 0,
      }),
      JSON.stringify({
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        created_at: "2026-10-16T12:00:15.000Z",
        input_tokens: 1500,
        cache_read_tokens: 600,
        output_tokens: 400,
        thinking_tokens: 120,
      }),
    ].join("\n");

    const record = await runUsage({
      host: "antigravity",
      inputContent: transcript,
      taskId: "task-agy-transcript",
      condition: "without",
    });

    expect(record.host).toBe("antigravity");
    expect(record.input_tokens.value).toBe(2500);
    expect(record.input_tokens.state).toBe("observed");
    expect(record.output_tokens.value).toBe(400);
    expect(record.output_tokens.state).toBe("observed");
    expect(record.cache_read_tokens.value).toBe(1000);
    expect(record.cache_read_tokens.state).toBe("observed");
    expect(record.cache_write_tokens.state).toBe("unsupported");
    expect(record.thinking_tokens.value).toBe(120);
    expect(record.thinking_tokens.state).toBe("observed");
    expect(record.total_tokens.value).toBe(2900); // 2500 + 400
    expect(record.wall_duration_seconds.value).toBe(15);
    expect(record.wall_duration_seconds.state).toBe("derived");
    expect(record.cost_usd_estimate.state).toBe("unsupported");
  });

  test("Antigravity hook invocation: reads transcriptPath from stdin hook payload", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-hook-test-"));
    const transcriptFile = path.join(tempDir, "transcript.jsonl");

    const transcriptLines = [
      JSON.stringify({
        step_index: 1,
        source: "USER_EXPLICIT",
        type: "USER_INPUT",
        input_tokens: 800,
        output_tokens: 0,
      }),
      JSON.stringify({
        step_index: 2,
        source: "MODEL",
        type: "PLANNER_RESPONSE",
        input_tokens: 1200,
        output_tokens: 350,
        cache_read_tokens: 500,
        thinking_tokens: 100,
      }),
    ].join("\n");

    await fs.writeFile(transcriptFile, transcriptLines, "utf8");

    const hookPayload = JSON.stringify({
      conversationId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      transcriptPath: transcriptFile,
      terminationReason: "NO_TOOL_CALL",
      fullyIdle: true,
    });

    const record = await runUsage({
      host: "antigravity",
      inputContent: hookPayload,
      taskId: "continuous",
      condition: "with",
    });

    expect(record.host).toBe("antigravity");
    expect(record.scope_id).toBe("[UUID]"); // Sanitized UUID
    expect(record.input_tokens.value).toBe(2000);
    expect(record.output_tokens.value).toBe(350);
    expect(record.cache_read_tokens.value).toBe(500);
    expect(record.thinking_tokens.value).toBe(100);
    expect(record.total_tokens.value).toBe(2350);

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("Antigravity hook handles unreadable transcriptPath gracefully with collection_error", async () => {
    const hookPayload = JSON.stringify({
      conversationId: "conv-missing",
      transcriptPath: "/non/existent/path/transcript.jsonl",
    });

    const record = await runUsage({
      host: "antigravity",
      inputContent: hookPayload,
    });

    expect(record.host).toBe("antigravity");
    expect(record.input_tokens.state).toBe("collection_error");
    expect(record.output_tokens.state).toBe("collection_error");
    expect(record.total_tokens.state).toBe("collection_error");
  });

  test("OpenCode Session Export: parses turns, cache, reasoning tokens, and cost", async () => {
    const sessionData = JSON.stringify({
      info: {
        id: "12345678-abcd-ef01-2345-6789abcdef01",
        version: "2.0.29",
        created_at: 1729080000000,
        updated_at: 1729080030000,
      },
      messages: [
        {
          role: "user",
          content: "Please fix bug in auth",
        },
        {
          role: "assistant",
          tokens: {
            input: 1500,
            output: 400,
            reasoning: 200,
            cache: {
              read: 800,
              write: 150,
            },
          },
          cost: 0.0055,
        },
        {
          role: "assistant",
          tokens: {
            input: 1000,
            output: 250,
            reasoning: 100,
            cache: {
              read: 400,
              write: 50,
            },
          },
          cost: 0.0035,
        },
      ],
    });

    const record = await runUsage({
      host: "opencode",
      inputContent: sessionData,
      taskId: "task-opencode-01",
      condition: "with",
    });

    expect(record.host).toBe("opencode");
    expect(record.scope_id).toBe("[UUID]"); // Sanitized UUID
    expect(record.cli_version).toBe("2.0.29");
    expect(record.input_tokens.value).toBe(2500);
    expect(record.input_tokens.state).toBe("observed");
    expect(record.output_tokens.value).toBe(650);
    expect(record.output_tokens.state).toBe("observed");
    expect(record.cache_read_tokens.value).toBe(1200);
    expect(record.cache_read_tokens.state).toBe("observed");
    expect(record.cache_write_tokens.value).toBe(200);
    expect(record.cache_write_tokens.state).toBe("observed");
    expect(record.thinking_tokens.value).toBe(300);
    expect(record.thinking_tokens.state).toBe("observed");
    expect(record.total_tokens.value).toBe(4550); // 2500 + 650 + 1200 + 200
    expect(record.total_tokens.state).toBe("derived");
    expect(record.wall_duration_seconds.value).toBe(30);
    expect(record.wall_duration_seconds.state).toBe("derived");
    expect(record.cost_usd_estimate.value).toBe(0.009);
    expect(record.cost_usd_estimate.state).toBe("observed");
    expect(record.rate_limit_5h_used_pct?.state).toBe("unsupported");
    expect(record.rate_limit_7d_used_pct?.state).toBe("unsupported");
  });

  test("OpenCode Stats JSON output parses cleanly", () => {
    const statsJson = JSON.stringify({
      session_id: "stats-session",
      tokens: {
        input: 4200,
        output: 900,
        reasoning: 350,
        cache: {
          read: 1800,
          write: 250,
        },
      },
      cost: 0.0142,
      duration: 25.5,
    });

    const obs = parseOpencodeJson(statsJson);

    expect(obs.host).toBe("opencode");
    expect(obs.input_tokens.value).toBe(4200);
    expect(obs.output_tokens.value).toBe(900);
    expect(obs.cache_read_tokens.value).toBe(1800);
    expect(obs.cache_write_tokens.value).toBe(250);
    expect(obs.thinking_tokens.value).toBe(350);
    expect(obs.total_tokens.value).toBe(7150); // 4200 + 900 + 1800 + 250
    expect(obs.cost_usd_estimate.value).toBe(0.0142);
    expect(obs.wall_duration_seconds.value).toBe(25.5);
    expect(obs.wall_duration_seconds.state).toBe("observed");
  });

  test("OpenCode streaming JSON lines parse step accumulations", () => {
    const lines = [
      JSON.stringify({
        session_id: "opencode-stream",
        tokens: { input: 1000, output: 200, reasoning: 50, cache: { read: 500, write: 50 } },
        cost: 0.002,
        duration: 5,
      }),
      JSON.stringify({
        tokens: { input: 1200, output: 300, reasoning: 80, cache: { read: 600, write: 70 } },
        cost: 0.003,
        duration: 7,
      }),
    ].join("\n");

    const obs = parseOpencodeJson(lines);

    expect(obs.host).toBe("opencode");
    expect(obs.input_tokens.value).toBe(2200);
    expect(obs.output_tokens.value).toBe(500);
    expect(obs.cache_read_tokens.value).toBe(1100);
    expect(obs.cache_write_tokens.value).toBe(120);
    expect(obs.thinking_tokens.value).toBe(130);
    expect(obs.total_tokens.value).toBe(3920);
    expect(obs.cost_usd_estimate.value).toBe(0.005);
    expect(obs.wall_duration_seconds.value).toBe(12);
  });

  test("PII Sanitization strips emails, bearer tokens, and UUIDs across fields", () => {
    const raw = "Contact alice.dev+test@example.org with Bearer sk-ant-1234567890abcdef for session 99998888-7777-6666-5555-444433332222";
    const clean = sanitizeText(raw);

    expect(clean).not.toContain("alice.dev+test@example.org");
    expect(clean).toContain("[SCRUBBED_EMAIL]");
    expect(clean).not.toContain("sk-ant-1234567890abcdef");
    expect(clean).toContain("Bearer [SCRUBBED_TOKEN]");
    expect(clean).not.toContain("99998888-7777-6666-5555-444433332222");
    expect(clean).toContain("[UUID]");
  });

  test("Honest state reporting: unobservable metrics report absent or unsupported, never fabricated", () => {
    // Empty JSON objects for all hosts
    const emptyClaude = parseClaudeCodeOtel("");
    expect(emptyClaude.input_tokens.state).toBe("absent");
    expect(emptyClaude.input_tokens.value).toBeUndefined();
    expect(emptyClaude.thinking_tokens.state).toBe("unsupported");
    expect(emptyClaude.rate_limit_5h_used_pct?.state).toBe("absent");

    const emptyAgy = parseAntigravityTranscript("");
    expect(emptyAgy.input_tokens.state).toBe("absent");
    expect(emptyAgy.input_tokens.value).toBeUndefined();
    expect(emptyAgy.cost_usd_estimate.state).toBe("unsupported");
    expect(emptyAgy.cost_usd_estimate.value).toBeUndefined();
    expect(emptyAgy.cache_write_tokens.state).toBe("unsupported");

    const emptyOpenCode = parseOpencodeJson("{}");
    expect(emptyOpenCode.input_tokens.state).toBe("absent");
    expect(emptyOpenCode.input_tokens.value).toBeUndefined();
    expect(emptyOpenCode.rate_limit_5h_used_pct?.state).toBe("unsupported");
    expect(emptyOpenCode.rate_limit_7d_used_pct?.state).toBe("unsupported");
  });

  test("CLI flag parsing and validation", () => {
    const parsed = parseCliArgs([
      "--host",
      "opencode",
      "--in",
      "run.json",
      "--task-id",
      "my-task",
      "--condition",
      "without",
      "--out",
      "records/usage/out.jsonl",
    ]);

    expect(parsed.host).toBe("opencode");
    expect(parsed.inFile).toBe("run.json");
    expect(parsed.taskId).toBe("my-task");
    expect(parsed.condition).toBe("without");
    expect(parsed.outFile).toBe("records/usage/out.jsonl");

    // Invalid host
    expect(() => parseCliArgs(["--host", "invalid-host"])).toThrow(/Unsupported host/);

    // Invalid condition
    expect(() => parseCliArgs(["--host", "antigravity", "--condition", "maybe"])).toThrow(/Invalid condition/);

    // Missing host
    expect(() => parseCliArgs(["--in", "foo.log"])).toThrow(/Missing required flag/);
  });

  test("File writing: --out appends JSONL lines correctly", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "usage-out-test-"));
    const outFile = path.join(tempDir, "traces.jsonl");

    const sample = JSON.stringify({
      duration_seconds: 5,
      usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
    });

    await runUsage({
      host: "antigravity",
      inputContent: sample,
      taskId: "t1",
      condition: "with",
      outFile,
    });

    await runUsage({
      host: "antigravity",
      inputContent: sample,
      taskId: "t2",
      condition: "without",
      outFile,
    });

    const written = await fs.readFile(outFile, "utf8");
    const lines = written.trim().split("\n");
    expect(lines.length).toBe(2);

    const r1 = JSON.parse(lines[0]);
    const r2 = JSON.parse(lines[1]);
    expect(r1.task_id).toBe("t1");
    expect(r1.condition).toBe("with");
    expect(r1.input_tokens.value).toBe(100);

    expect(r2.task_id).toBe("t2");
    expect(r2.condition).toBe("without");
    expect(r2.output_tokens.value).toBe(50);

    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("Antigravity lifecycle hook in .agents/hooks.json exists and configures Stop event", async () => {
    const hooksPath = path.resolve(".agents/hooks.json");
    const content = await fs.readFile(hooksPath, "utf8");
    const parsed = JSON.parse(content);

    expect(parsed["usage-telemetry"]).toBeDefined();
    expect(Array.isArray(parsed["usage-telemetry"].Stop)).toBe(true);

    const stopHook = parsed["usage-telemetry"].Stop[0];
    expect(stopHook.type).toBe("command");
    expect(stopHook.command).toContain("bun tools/eval/run_usage.ts");
    expect(stopHook.command).toContain("--host antigravity");
    expect(stopHook.command).toContain("--in -stdin");
    expect(stopHook.command).toContain("--out records/usage/continuous-antigravity.jsonl");
  });
});

describe("OMP host (tools/eval/run_usage.ts)", () => {
  const ompFixture = [
    `{"type":"session","version":3,"id":"01a145f4-758a-7748-b62f-9120a5c936bc","timestamp":"2026-10-16T18:24:31.210Z","cwd":"/tmp/x"}`,
    `{"type":"model_change","id":"m1","parentId":null,"timestamp":"2026-10-16T18:24:31.269Z","runtime":{"version":"18.11.2"},"model":"anthropic/claude-opus-5-5"}`,
    `{"type":"message","id":"a1","parentId":"m1","timestamp":"2026-10-16T18:24:31.260Z","message":{"role":"assistant","model":"claude-opus-5-5","usage":{"input":4,"output":288,"cacheRead":0,"cacheWrite":14107,"totalTokens":14399,"cost":{"total":0.118632}}}}`,
    `{"type":"message","id":"u1","parentId":"a1","timestamp":"2026-10-16T18:24:35.000Z","message":{"role":"user","content":"secret prompt text"}}`,
    `{"type":"message","id":"a2","parentId":"u1","timestamp":"2026-10-16T18:24:39.445Z","message":{"role":"assistant","model":"claude-opus-5-5","usage":{"input":2,"output":634,"cacheRead":14107,"cacheWrite":5536,"totalTokens":20279,"cost":{"total":0.0597974}}}}`,
    "not json",
  ].join("\n");

  test("parseCliArgs accepts --host omp", () => {
    const opts = parseCliArgs(["--host", "omp", "--in", "f.jsonl"]);
    expect(opts.host).toBe("omp");
    expect(opts.inFile).toBe("f.jsonl");
  });

  test("runUsage ingests an OMP session into a TelemetryRecord", async () => {
    const record = await runUsage({ host: "omp", inputContent: ompFixture, taskId: "omp-task" });
    expect(record.host).toBe("omp");
    expect(record.task_id).toBe("omp-task");
    expect(record.total_tokens.value).toBe(34678);
    expect(record.input_tokens.state).toBe("observed");
  });

  test("--help lists omp as a host", async () => {
    const proc = Bun.spawn(["bun", path.resolve("tools/eval/run_usage.ts"), "--help"], { stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    expect(out).toContain("claude-code|antigravity|opencode|omp");
  });
});
