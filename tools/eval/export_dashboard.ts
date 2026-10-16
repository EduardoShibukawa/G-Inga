/**
 * tools/eval/export_dashboard.ts
 *
 * Local telemetry exporter and dashboard visualizer for G-Ingá.
 * Parses records/usage-ledger.tsv (18-column schema from ADR 0006) and generates
 * a self-contained, offline-compatible HTML/SVG report visualizing:
 * - Cumulative and per-run token consumption (input, output, cache read).
 * - Cache hit ratios across hosts and conditions (with vs without).
 * - Task quality score trajectories and LLM-as-a-judge evaluations.
 * - Summary cards and host breakdowns.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface LedgerRow {
  timestamp: string;
  run_id: string;
  task_id: string;
  epic_id: string;
  host: string;
  model: string;
  condition: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  cache_ratio: number;
  cost_usd: number;
  duration_s: number;
  quality_score: number;
  state: string;
  note: string;
}

export interface DashboardSummary {
  totalRuns: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  overallCacheRatio: number;
  averageQualityScore: number;
  hostBreakdown: Record<string, { runs: number; totalTokens: number; avgCacheRatio: number }>;
  conditionBreakdown: Record<string, { runs: number; totalTokens: number; avgCacheRatio: number }>;
  rows: LedgerRow[];
}

export interface ExportDashboardOptions {
  ledgerPath?: string;
  outputPath?: string;
}

function parseNumeric(val: string): number {
  if (!val || val === "-" || val === "unsupported" || val === "absent" || val === "collection_error") {
    return 0;
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses raw 18-column TSV text from records/usage-ledger.tsv into structured LedgerRow objects.
 */
export function parseLedgerTsv(tsvContent: string): LedgerRow[] {
  const lines = tsvContent.trim().split("\n");
  if (lines.length <= 1) return [];

  const rows: LedgerRow[] = [];
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length < 18) continue;

    rows.push({
      timestamp: cols[0],
      run_id: cols[1],
      task_id: cols[2],
      epic_id: cols[3],
      host: cols[4],
      model: cols[5],
      condition: cols[6],
      input_tokens: parseNumeric(cols[7]),
      output_tokens: parseNumeric(cols[8]),
      cache_read_tokens: parseNumeric(cols[9]),
      cache_write_tokens: parseNumeric(cols[10]),
      total_tokens: parseNumeric(cols[11]),
      cache_ratio: parseNumeric(cols[12]),
      cost_usd: parseNumeric(cols[13]),
      duration_s: parseNumeric(cols[14]),
      quality_score: parseNumeric(cols[15]),
      state: cols[16],
      note: cols[17],
    });
  }

  return rows;
}

/**
 * Aggregates ledger rows into summary statistics for rendering.
 */
export function computeDashboardSummary(rows: LedgerRow[]): DashboardSummary {
  const totalRuns = rows.length;
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let qualitySum = 0;
  let qualityCount = 0;

  const hostMap: Record<string, { runs: number; totalTokens: number; cacheRatioSum: number }> = {};
  const condMap: Record<string, { runs: number; totalTokens: number; cacheRatioSum: number }> = {};

  for (const r of rows) {
    totalTokens += r.total_tokens;
    totalInputTokens += r.input_tokens;
    totalOutputTokens += r.output_tokens;
    totalCacheReadTokens += r.cache_read_tokens;

    if (r.quality_score > 0) {
      qualitySum += r.quality_score;
      qualityCount++;
    }

    // Host aggregation
    const hostKey = r.host || "unknown";
    if (!hostMap[hostKey]) {
      hostMap[hostKey] = { runs: 0, totalTokens: 0, cacheRatioSum: 0 };
    }
    hostMap[hostKey].runs++;
    hostMap[hostKey].totalTokens += r.total_tokens;
    hostMap[hostKey].cacheRatioSum += r.cache_ratio;

    // Condition aggregation
    const condKey = r.condition || "standard";
    if (!condMap[condKey]) {
      condMap[condKey] = { runs: 0, totalTokens: 0, cacheRatioSum: 0 };
    }
    condMap[condKey].runs++;
    condMap[condKey].totalTokens += r.total_tokens;
    condMap[condKey].cacheRatioSum += r.cache_ratio;
  }

  const denominator = totalInputTokens + totalCacheReadTokens;
  const overallCacheRatio = denominator > 0 ? totalCacheReadTokens / denominator : 0;
  const averageQualityScore = qualityCount > 0 ? qualitySum / qualityCount : 0;

  const hostBreakdown: Record<string, { runs: number; totalTokens: number; avgCacheRatio: number }> = {};
  for (const [h, data] of Object.entries(hostMap)) {
    hostBreakdown[h] = {
      runs: data.runs,
      totalTokens: data.totalTokens,
      avgCacheRatio: data.runs > 0 ? data.cacheRatioSum / data.runs : 0,
    };
  }

  const conditionBreakdown: Record<string, { runs: number; totalTokens: number; avgCacheRatio: number }> = {};
  for (const [c, data] of Object.entries(condMap)) {
    conditionBreakdown[c] = {
      runs: data.runs,
      totalTokens: data.totalTokens,
      avgCacheRatio: data.runs > 0 ? data.cacheRatioSum / data.runs : 0,
    };
  }

  return {
    totalRuns,
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    overallCacheRatio: Math.round(overallCacheRatio * 10000) / 10000,
    averageQualityScore: Math.round(averageQualityScore * 100) / 100,
    hostBreakdown,
    conditionBreakdown,
    rows,
  };
}

/**
 * Generates an SVG bar chart visualizing cache ratios per run.
 */
export function generateCacheRatioSvg(rows: LedgerRow[], width = 700, height = 180): string {
  if (rows.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="20" y="90" fill="#888">No telemetry data recorded.</text></svg>`;
  }

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = Math.max(8, Math.min(32, Math.floor(chartWidth / rows.length) - 4));

  const bars = rows.map((r, i) => {
    const x = padding + i * (barWidth + 4);
    const barH = Math.round(r.cache_ratio * chartHeight);
    const y = padding + chartHeight - barH;
    const color = r.condition === "with" ? "#22c55e" : "#3b82f6";
    const label = (r.cache_ratio * 100).toFixed(0) + "%";
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" fill="${color}" rx="2"><title>${r.task_id} (${r.host}): ${label}</title></rect>
            <text x="${x + barWidth / 2}" y="${y - 4}" font-size="10" text-anchor="middle" fill="#64748b">${label}</text>`;
  });

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padding}" y1="${padding + chartHeight}" x2="${width - padding}" y2="${padding + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>
    <text x="${padding}" y="${padding - 10}" font-size="12" font-family="sans-serif" font-weight="bold" fill="#334155">Cache Hit Ratio per Run (%)</text>
    ${bars.join("\n    ")}
  </svg>`;
}

/**
 * Renders the full standalone HTML dashboard.
 */
export function renderDashboardHtml(summary: DashboardSummary): string {
  const cacheSvg = generateCacheRatioSvg(summary.rows);

  const hostCards = Object.entries(summary.hostBreakdown)
    .map(
      ([h, d]) => `
      <div class="card">
        <h3>${h}</h3>
        <p><strong>Runs:</strong> ${d.runs}</p>
        <p><strong>Tokens:</strong> ${d.totalTokens.toLocaleString()}</p>
        <p><strong>Avg Cache Ratio:</strong> ${(d.avgCacheRatio * 100).toFixed(1)}%</p>
      </div>`,
    )
    .join("");

  const recentRows = summary.rows
    .slice(-15)
    .reverse()
    .map(
      (r) => `
      <tr>
        <td>${r.timestamp.substring(11, 19)}</td>
        <td title="${r.run_id}">${r.run_id}</td>
        <td title="${r.task_id}">${r.task_id.length > 25 ? r.task_id.substring(0, 22) + "..." : r.task_id}</td>
        <td><span class="badge ${r.host}">${r.host}</span></td>
        <td><span class="condition-${r.condition}">${r.condition}</span></td>
        <td>${r.total_tokens.toLocaleString()}</td>
        <td>${(r.cache_ratio * 100).toFixed(1)}%</td>
        <td>${r.quality_score > 0 ? r.quality_score.toFixed(2) : "-"}</td>
        <td>${r.state}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>G-Ingá Local Telemetry Dashboard</title>
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --primary: #3b82f6;
      --success: #22c55e;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
    }
    .header {
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 24px;
    }
    .header p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .metric-box .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .metric-box .val {
      font-size: 24px;
      font-weight: bold;
      color: var(--text);
    }
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .section h2 {
      margin-top: 0;
      font-size: 18px;
      margin-bottom: 16px;
    }
    .host-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      background: #f1f5f9;
    }
    .card h3 {
      margin: 0 0 8px 0;
      font-size: 15px;
      text-transform: capitalize;
    }
    .card p {
      margin: 4px 0;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: #f1f5f9;
      color: var(--muted);
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: #e2e8f0;
    }
    .badge.antigravity { background: #e0e7ff; color: #4338ca; }
    .badge.claude-code { background: #ffedd5; color: #c2410c; }
    .badge.opencode { background: #fce7f3; color: #be185d; }
    .condition-with { color: var(--success); font-weight: 600; }
    .condition-without { color: var(--primary); font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>G-Ingá Local Telemetry Dashboard</h1>
    <p>Operational usage analytics from <code>records/usage-ledger.tsv</code> adhering to ADR 0006.</p>
  </div>

  <div class="metrics-grid">
    <div class="metric-box">
      <div class="label">Total Recorded Runs</div>
      <div class="val">${summary.totalRuns}</div>
    </div>
    <div class="metric-box">
      <div class="label">Total Tokens Tracked</div>
      <div class="val">${summary.totalTokens.toLocaleString()}</div>
    </div>
    <div class="metric-box">
      <div class="label">Overall Cache Ratio</div>
      <div class="val">${(summary.overallCacheRatio * 100).toFixed(1)}%</div>
    </div>
    <div class="metric-box">
      <div class="label">Mean Quality Score</div>
      <div class="val">${summary.averageQualityScore.toFixed(2)}</div>
    </div>
  </div>

  <div class="section">
    <h2>Cache Hit Trajectory</h2>
    <div style="overflow-x: auto;">
      ${cacheSvg}
    </div>
  </div>

  <div class="section">
    <h2>Host Breakdown</h2>
    <div class="host-grid">
      ${hostCards}
    </div>
  </div>

  <div class="section">
    <h2>Recent Runs</h2>
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Run ID</th>
            <th>Task ID</th>
            <th>Host</th>
            <th>Cond</th>
            <th>Total Tokens</th>
            <th>Cache %</th>
            <th>Quality</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          ${recentRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Main export function reads ledger, computes summary, and writes self-contained HTML.
 */
export async function exportDashboard(options: ExportDashboardOptions = {}): Promise<string> {
  const ledgerPath = options.ledgerPath ?? path.resolve(process.cwd(), "records/usage-ledger.tsv");
  const outputPath = options.outputPath ?? path.resolve(process.cwd(), "records/telemetry-dashboard.html");

  const tsvText = await fs.readFile(ledgerPath, "utf8");
  const rows = parseLedgerTsv(tsvText);
  const summary = computeDashboardSummary(rows);
  const html = renderDashboardHtml(summary);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, "utf8");

  return outputPath;
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2);
  let ledgerPath: string | undefined;
  let outputPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ledger" && args[i + 1]) {
      ledgerPath = args[++i];
    } else if (args[i] === "--out" && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  exportDashboard({ ledgerPath, outputPath })
    .then((out) => {
      console.log(`Telemetry dashboard exported successfully to: ${out}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`Export dashboard error: ${String(err)}`);
      process.exit(1);
    });
}
