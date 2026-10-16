# Continuous Usage Telemetry Summary

- Generated: `2026-10-16T16:16:43.246Z`
- Total runs aggregated: **3** (across 3 raw observations)
- Total token footprint: **137,658** tokens
- Overall cache hit ratio: **86.4%**
- Estimated cost: **$0.1000 USD**

## Condition Comparison (with vs without)

| Condition | Runs | Total Tokens | Mean Tokens | Cache Hit Ratio | Cost (USD) | Mean Duration |
|---|---|---|---|---|---|---|
| `with` | 2 | 131,658 | 65,829 | 86.8% | $0.0500 | 107.0s |
| `without` | 1 | 6,000 | 6,000 | 0.0% | $0.0500 | 0.0s |
| **Delta** | — | **+125,658 (-2094.3% savings)** | — | — | $0.0000 | +214.0s |

## Task Breakdown

| Task ID | Runs | With Tok | Without Tok | Savings | Cache Hit Ratio | Cost (USD) | Duration |
|---|---|---|---|---|---|---|---|
| `2026-10-16-usage-telemetry-pipeline-05-review-and-integration` | 1 | 120,658 | — | — | 87.2% | $0.0000 | 214.0s |
| `work-standard-valid-record` | 2 | 11,000 | 6,000 | -83.3% | 33.3% | $0.1000 | 0.0s |

## Host Distribution

| Host | Runs | Total Tokens | Input | Output | Cache Read | Cache Ratio | Cost (USD) |
|---|---|---|---|---|---|---|---|
| `antigravity` | 1 | 120,658 | 115,888 | 4,770 | 791,434 | 87.2% | $0.0000 |
| `claude-code` | 2 | 17,000 | 10,000 | 2,000 | 5,000 | 33.3% | $0.1000 |

## Aggregated Run Details

| Run ID | Task ID | Host | Arm | Total Tokens | Cache Ratio | Cost | Duration | Score | State |
|---|---|---|---|---|---|---|---|---|---|
| `run-01` | `2026-10-16-usage-telemetry-pipeline-05-review-and-integration` | `antigravity` | `with` | 120,658 | 87.2% | `unsupported` | 214.0s | - | `observed` |
| `work-standard-valid-record-with-iter1` | `work-standard-valid-record` | `claude-code` | `with` | 11,000 | 50.0% | $0.0500 | 0.0s | 0 | `observed` |
| `work-standard-valid-record-without-iter1` | `work-standard-valid-record` | `claude-code` | `without` | 6,000 | 0.0% | $0.0500 | 0.0s | 0 | `observed` |
