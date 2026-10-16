# Continuous Usage Telemetry Summary

- Generated: `2026-10-16T17:45:50.022Z`
- Total runs aggregated: **9** (across 9 raw observations)
- Total token footprint: **231,858** tokens
- Overall cache hit ratio: **81.8%**
- Estimated cost: **$0.3706 USD**

## Condition Comparison (with vs without)

| Condition | Runs | Total Tokens | Mean Tokens | Cache Hit Ratio | Cost (USD) | Mean Duration |
|---|---|---|---|---|---|---|
| `with` | 5 | 178,008 | 35,602 | 86.0% | $0.1355 | 50.2s |
| `without` | 4 | 53,850 | 13,463 | 0.0% | $0.2351 | 16.4s |
| **Delta** | — | **+124,158 (-230.6% savings)** | — | — | $-0.0996 | +185.8s |

## Task Breakdown

| Task ID | Runs | With Tok | Without Tok | Savings | Cache Hit Ratio | Cost (USD) | Duration |
|---|---|---|---|---|---|---|---|
| `2026-10-16-usage-telemetry-pipeline-05-review-and-integration` | 1 | 120,658 | — | — | 87.2% | $0.0000 | 214.0s |
| `work-standard-valid-record` | 8 | 57,350 | 53,850 | -6.5% | 31.5% | $0.3706 | 102.6s |

## Host Distribution

| Host | Runs | Total Tokens | Input | Output | Cache Read | Cache Ratio | Cost (USD) |
|---|---|---|---|---|---|---|---|
| `antigravity` | 3 | 152,058 | 134,888 | 6,770 | 800,034 | 85.6% | $0.0902 |
| `claude-code` | 4 | 48,400 | 29,000 | 4,000 | 13,600 | 31.9% | $0.1902 |
| `opencode` | 2 | 31,400 | 19,000 | 2,000 | 8,600 | 31.2% | $0.0902 |

## Aggregated Run Details

| Run ID | Task ID | Host | Arm | Total Tokens | Cache Ratio | Cost | Duration | Score | State |
|---|---|---|---|---|---|---|---|---|---|
| `run-01` | `2026-10-16-usage-telemetry-pipeline-05-review-and-integration` | `antigravity` | `with` | 120,658 | 87.2% | `unsupported` | 214.0s | - | `observed` |
| `work-standard-valid-record-antigravity-with-iter1` | `work-standard-valid-record` | `antigravity` | `with` | 15,450 | 67.2% | $0.0285 | 12.4s | 1 | `derived` |
| `work-standard-valid-record-antigravity-without-iter1` | `work-standard-valid-record` | `antigravity` | `without` | 15,950 | 0.0% | $0.0617 | 21.8s | 0.75 | `derived` |
| `work-standard-valid-record-claude-code-with-iter1` | `work-standard-valid-record` | `claude-code` | `with` | 15,450 | 67.2% | $0.0285 | 12.4s | 1 | `derived` |
| `work-standard-valid-record-claude-code-without-iter1` | `work-standard-valid-record` | `claude-code` | `without` | 15,950 | 0.0% | $0.0617 | 21.8s | 0.75 | `derived` |
| `work-standard-valid-record-opencode-with-iter1` | `work-standard-valid-record` | `opencode` | `with` | 15,450 | 67.2% | $0.0285 | 12.4s | 1 | `derived` |
| `work-standard-valid-record-opencode-without-iter1` | `work-standard-valid-record` | `opencode` | `without` | 15,950 | 0.0% | $0.0617 | 21.8s | 0.75 | `derived` |
| `work-standard-valid-record-with-iter1` | `work-standard-valid-record` | `claude-code` | `with` | 11,000 | 50.0% | $0.0500 | 0.0s | 0 | `observed` |
| `work-standard-valid-record-without-iter1` | `work-standard-valid-record` | `claude-code` | `without` | 6,000 | 0.0% | $0.0500 | 0.0s | 0 | `observed` |
