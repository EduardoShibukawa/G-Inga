import { describe, expect, test } from "bun:test";
import {
  parseAntigravityJson,
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
