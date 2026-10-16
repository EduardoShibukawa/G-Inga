/**
 * tools/eval/export_dashboard.test.ts
 *
 * Unit test suite for local telemetry dashboard exporter.
 * Verifies 18-column TSV parsing, aggregation metrics, SVG chart generation,
 * and self-contained HTML rendering without external dependencies.
 */

import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  computeDashboardSummary,
  exportDashboard,
  generateCacheRatioSvg,
  parseLedgerTsv,
  renderDashboardHtml,
} from "./export_dashboard";

const SAMPLE_TSV = `timestamp	run_id	task_id	epic_id	host	model	condition	input_tokens	output_tokens	cache_read_tokens	cache_write_tokens	total_tokens	cache_ratio	cost_usd	duration_s	quality_score	state	note
2026-10-16T16:14:27.839Z	run-01	task-01	epic-01	antigravity	gemini-2.5-pro	with	1000	200	8000	unsupported	1200	0.8888	unsupported	10.5	0.95	observed	test run 1
2026-10-16T16:15:05.239Z	run-02	task-01	epic-01	claude-code	claude-3-5-sonnet	without	5000	1000	0	0	6000	0.0000	0.0500	15.2	0.80	observed	test run 2
2026-10-16T16:16:00.000Z	run-03	task-02	epic-01	opencode	default	with	2000	500	4000	1000	2500	0.6667	0.0200	8.0	-	derived	test run 3`;

describe("export_dashboard", () => {
  describe("parseLedgerTsv", () => {
    it("parses 18-column TSV rows into structured objects", () => {
      const rows = parseLedgerTsv(SAMPLE_TSV);
      expect(rows.length).toBe(3);

      expect(rows[0].run_id).toBe("run-01");
      expect(rows[0].host).toBe("antigravity");
      expect(rows[0].condition).toBe("with");
      expect(rows[0].input_tokens).toBe(1000);
      expect(rows[0].output_tokens).toBe(200);
      expect(rows[0].cache_read_tokens).toBe(8000);
      expect(rows[0].cache_ratio).toBeCloseTo(0.8888, 4);
      expect(rows[0].quality_score).toBe(0.95);

      // Handles 'unsupported' and '-' as 0 for numeric fields
      expect(rows[0].cache_write_tokens).toBe(0);
      expect(rows[0].cost_usd).toBe(0);
      expect(rows[2].quality_score).toBe(0);
    });

    it("returns empty array for empty or header-only TSV", () => {
      expect(parseLedgerTsv("")).toEqual([]);
      expect(parseLedgerTsv("timestamp\trun_id\n")).toEqual([]);
    });
  });

  describe("computeDashboardSummary", () => {
    it("aggregates totals, overall cache ratio, and host breakdowns accurately", () => {
      const rows = parseLedgerTsv(SAMPLE_TSV);
      const summary = computeDashboardSummary(rows);

      expect(summary.totalRuns).toBe(3);
      expect(summary.totalTokens).toBe(1200 + 6000 + 2500); // 9700
      expect(summary.totalInputTokens).toBe(1000 + 5000 + 2000); // 8000
      expect(summary.totalCacheReadTokens).toBe(8000 + 0 + 4000); // 12000

      // Overall cache ratio = 12000 / (8000 + 12000) = 12000 / 20000 = 0.60
      expect(summary.overallCacheRatio).toBe(0.6);

      // Host breakdown check
      expect(summary.hostBreakdown["antigravity"].runs).toBe(1);
      expect(summary.hostBreakdown["claude-code"].runs).toBe(1);
      expect(summary.hostBreakdown["opencode"].runs).toBe(1);

      // Average quality score (0.95 + 0.80) / 2 = 0.875 -> 0.88
      expect(summary.averageQualityScore).toBe(0.88);
    });
  });

  describe("generateCacheRatioSvg", () => {
    it("renders SVG markup with bars representing cache hit ratios", () => {
      const rows = parseLedgerTsv(SAMPLE_TSV);
      const svg = generateCacheRatioSvg(rows);

      expect(svg).toContain("<svg");
      expect(svg).toContain("Cache Hit Ratio per Run (%)");
      expect(svg).toContain("<rect");
      expect(svg).toContain("</svg>");
    });

    it("handles empty rows with fallback message", () => {
      const svg = generateCacheRatioSvg([]);
      expect(svg).toContain("No telemetry data recorded.");
    });
  });

  describe("renderDashboardHtml", () => {
    it("produces valid standalone HTML without external script or CDN tags", () => {
      const rows = parseLedgerTsv(SAMPLE_TSV);
      const summary = computeDashboardSummary(rows);
      const html = renderDashboardHtml(summary);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<title>G-Ingá Local Telemetry Dashboard</title>");
      expect(html).toContain("Total Recorded Runs");
      expect(html).toContain("antigravity");
      expect(html).toContain("claude-code");

      // Verify hermetic requirement: no external script tags or remote stylesheets
      expect(html).not.toContain("<script src=");
      expect(html).not.toContain("https://");
      expect(html).not.toContain("<link rel=\"stylesheet\" href=\"http");
    });
  });

  describe("exportDashboard file emission", () => {
    it("reads ledger TSV and exports HTML dashboard to disk", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ginga-dashboard-test-"));
      const tsvFile = path.join(tempDir, "ledger.tsv");
      const htmlFile = path.join(tempDir, "dashboard.html");

      await fs.writeFile(tsvFile, SAMPLE_TSV, "utf8");

      const out = await exportDashboard({
        ledgerPath: tsvFile,
        outputPath: htmlFile,
      });

      expect(out).toBe(htmlFile);
      const content = await fs.readFile(htmlFile, "utf8");
      expect(content).toContain("G-Ingá Local Telemetry Dashboard");
      expect(content).toContain("run-01");

      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });
});
