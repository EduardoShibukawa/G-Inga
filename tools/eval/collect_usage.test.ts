import { describe, expect, test } from "bun:test";
import {
  parseAntigravityJson,
  parseOmpSession,
  parseClaudeCodeOtel,
  sanitizeText,
  formatObservationMarkdown,
} from "./collect_usage";

describe("Privacy sanitizer", () => {
  test("scrubs emails, auth tokens, and UUIDs", () => {
    const raw = "User dev@example.com invoked session 12345678-abcd-1234-abcd-123456789abc with Bearer sk-secret-123";
    const clean = sanitizeText(raw);
    expect(clean).not.toContain("dev@example.com");
    expect(clean).toContain("[SCRUBBED_EMAIL]");
    expect(clean).not.toContain("12345678-abcd-1234-abcd-123456789abc");
    expect(clean).toContain("[UUID]");
    expect(clean).not.toContain("sk-secret-123");
    expect(clean).toContain("Bearer [SCRUBBED_TOKEN]");
  });
});

describe("Antigravity JSON parser", () => {
  test("extracts cumulative tokens and correctly classifies unsupported fields", () => {
    const sample = JSON.stringify({
      conversation_id: "9fc46f78-1111-2222-3333-444455556666",
      status: "SUCCESS",
      duration_seconds: 14.25,
      usage: {
        input_tokens: 12150,
        cache_read_tokens: 450,
        output_tokens: 1200,
        thinking_tokens: 800,
        total_tokens: 13350,
      },
    });

    const obs = parseAntigravityJson(sample);

    expect(obs.host).toBe("antigravity");
    expect(obs.input_tokens.value).toBe(12150);
    expect(obs.input_tokens.state).toBe("observed");
    expect(obs.cache_read_tokens.value).toBe(450);
    expect(obs.cache_read_tokens.state).toBe("observed");
    expect(obs.output_tokens.value).toBe(1200);
    expect(obs.output_tokens.state).toBe("observed");
    expect(obs.thinking_tokens.value).toBe(800);
    expect(obs.thinking_tokens.state).toBe("observed");
    expect(obs.total_tokens.value).toBe(13350);
    expect(obs.total_tokens.state).toBe("observed");
    expect(obs.wall_duration_seconds.value).toBe(14.25);
    expect(obs.wall_duration_seconds.state).toBe("observed");

    // Unsupported dimensions in Antigravity headless JSON
    expect(obs.cache_write_tokens.state).toBe("unsupported");
    expect(obs.cost_usd_estimate.state).toBe("unsupported");

    // Scope should be scrubbed of raw uuid
    expect(obs.scope_id).toBe("[UUID]");
  });
});

describe("Claude Code OTel parser", () => {
  test("aggregates metrics and computes derived total", () => {
    const logs = [
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "input" },
        value: 1500,
      }),
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "output" },
        value: 300,
      }),
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "cacheRead" },
        value: 200,
      }),
      JSON.stringify({
        metric: "token.usage",
        attributes: { type: "cacheCreation" },
        value: 100,
      }),
      JSON.stringify({
        metric: "cost.usage",
        value: 0.045,
      }),
      JSON.stringify({
        metric: "active_time.total",
        value: 5000, // 5 sec
      }),
    ];

    const obs = parseClaudeCodeOtel(logs);

    expect(obs.host).toBe("claude-code");
    expect(obs.input_tokens.value).toBe(1500);
    expect(obs.input_tokens.state).toBe("observed");
    expect(obs.output_tokens.value).toBe(300);
    expect(obs.output_tokens.state).toBe("observed");
    expect(obs.cache_read_tokens.value).toBe(200);
    expect(obs.cache_read_tokens.state).toBe("observed");
    expect(obs.cache_write_tokens.value).toBe(100);
    expect(obs.cache_write_tokens.state).toBe("observed");

    // Total is derived
    expect(obs.total_tokens.value).toBe(2100);
    expect(obs.total_tokens.state).toBe("derived");

    expect(obs.wall_duration_seconds.value).toBe(5);
    expect(obs.wall_duration_seconds.state).toBe("observed");

    // Cost estimate
    expect(obs.cost_usd_estimate.value).toBe(0.045);
    expect(obs.cost_usd_estimate.state).toBe("estimated");

    // Thinking is unsupported in Claude Code OTel
    expect(obs.thinking_tokens.state).toBe("unsupported");
  });
});

describe("Markdown observation formatter", () => {
  test("renders valid markdown table with states and notes", () => {
    const sample = JSON.stringify({
      conversation_id: "test-conversation",
      duration_seconds: 10,
      usage: {
        input_tokens: 1000,
        output_tokens: 200,
        total_tokens: 1200,
      },
    });

    const obs = parseAntigravityJson(sample);
    const md = formatObservationMarkdown(obs);

    expect(md).toContain("### Usage Observation: antigravity");
    expect(md).toContain("| Metric | State | Value | Note |");
    expect(md).toContain("| Input tokens | `observed` | 1,000 |");
    expect(md).toContain("| Thinking tokens | `absent` | — |");
    expect(md).toContain("| List price estimate (USD) | `unsupported` |");
  });
});

const OMP_FIXTURE = [
  `{"type":"session","version":3,"id":"01a145f4-758a-7748-b62f-9120a5c936bc","timestamp":"2026-10-16T18:24:31.210Z","cwd":"/tmp/x"}`,
  `{"type":"model_change","id":"m1","parentId":null,"timestamp":"2026-10-16T18:24:31.269Z","runtime":{"version":"18.11.2"},"model":"anthropic/claude-opus-5-5"}`,
  `{"type":"message","id":"a1","parentId":"m1","timestamp":"2026-10-16T18:24:31.260Z","message":{"role":"assistant","model":"claude-opus-5-5","usage":{"input":4,"output":288,"cacheRead":0,"cacheWrite":14107,"totalTokens":14399,"cost":{"total":0.118632}}}}`,
  `{"type":"message","id":"u1","parentId":"a1","timestamp":"2026-10-16T18:24:35.000Z","message":{"role":"user","content":"secret prompt text"}}`,
  `{"type":"message","id":"a2","parentId":"u1","timestamp":"2026-10-16T18:24:39.445Z","message":{"role":"assistant","model":"claude-opus-5-5","usage":{"input":2,"output":634,"cacheRead":14107,"cacheWrite":5536,"totalTokens":20279,"cost":{"total":0.0597974}}}}`,
  "not json",
].join("\n");

describe("OMP session parser", () => {
  test("sums assistant usage, cost and wall duration from the fixture", () => {
    const obs = parseOmpSession(OMP_FIXTURE);

    expect(obs.host).toBe("omp");
    expect(obs.cli_version).toBe("18.11.2");
    expect(obs.scope_id).toBeTruthy();
    expect(obs.input_tokens).toMatchObject({ value: 6, state: "observed" });
    expect(obs.output_tokens).toMatchObject({ value: 922, state: "observed" });
    expect(obs.cache_read_tokens).toMatchObject({ value: 14107, state: "observed" });
    expect(obs.cache_write_tokens).toMatchObject({ value: 19643, state: "observed" });
    expect(obs.total_tokens).toMatchObject({ value: 34678, state: "observed" });
    expect(obs.cost_usd_estimate.state).toBe("estimated");
    expect(obs.cost_usd_estimate.value).toBeCloseTo(0.1784294, 6);
    expect(obs.wall_duration_seconds.state).toBe("derived");
    expect(obs.wall_duration_seconds.value).toBeCloseTo(8.235, 6);
    expect(obs.thinking_tokens.state).toBe("unsupported");
  });

  test("adds model_usage entries to the sums", () => {
    const extra = `{"type":"model_usage","timestamp":"2026-10-16T18:24:40.000Z","usage":{"input":10,"output":5,"cacheRead":0,"cacheWrite":0,"totalTokens":15,"cost":{"total":0.001}}}`;
    const obs = parseOmpSession(`${OMP_FIXTURE}\n${extra}`);

    expect(obs.input_tokens.value).toBe(16);
    expect(obs.output_tokens.value).toBe(927);
    expect(obs.total_tokens.value).toBe(34693);
    expect(obs.cost_usd_estimate.value).toBeCloseTo(0.1794294, 6);
  });

  test("returns absent token and cost states without usage entries and never throws", () => {
    const noUsage = [
      `{"type":"session","id":"01a145f4-758a-7748-b62f-9120a5c936bc","timestamp":"2026-10-16T18:24:31.210Z"}`,
      `{"type":"model_change","timestamp":"2026-10-16T18:24:31.269Z","runtime":{"version":"18.11.2"}}`,
      "null",
      "",
    ].join("\n");
    const obs = parseOmpSession(noUsage);

    for (const field of [
      obs.input_tokens,
      obs.output_tokens,
      obs.cache_read_tokens,
      obs.cache_write_tokens,
      obs.total_tokens,
      obs.cost_usd_estimate,
    ]) {
      expect(field.state).toBe("absent");
      expect(field.value).toBeUndefined();
    }
    expect(obs.cli_version).toBe("18.11.2");
  });

  test("never copies prompt text into the observation", () => {
    const obs = parseOmpSession(OMP_FIXTURE);
    expect(JSON.stringify(obs)).not.toContain("secret prompt text");
  });
});
