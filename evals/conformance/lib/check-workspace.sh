#!/usr/bin/env bash
# Post-run validator check for the work-standard-valid-record case, with no model call.
# Run it on a workspace kept by `claude plugin eval ... --keep-temp`:
#
#   bash evals/conformance/lib/check-workspace.sh <kept-workspace-dir> [task-id]
#
# It runs this repository's standalone validator (same bytes the scaffold copied) against the
# workspace and prints one result line in the repo vocabulary. Exit codes follow the validator:
# 0 pass, 1 fail, 2 blocked.
set -uo pipefail

ws="${1:-}"
id="${2:-2026-10-13-shout-option}"
lib="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
validator="$lib/../../../tools/validate/validate.js"

if [[ -z "$ws" || ! -d "$ws" ]]; then
  echo "check-workspace: blocked (workspace directory not given or missing)"
  exit 2
fi
if [[ ! -f "$ws/tasks/$id.md" ]]; then
  echo "check-workspace: fail (tasks/$id.md was not created)"
  exit 1
fi

node "$validator" --root "$ws"
code=$?
case "$code" in
  0) echo "check-workspace: pass (validator exit 0 on $ws)" ;;
  1) echo "check-workspace: fail (validator exit 1 on $ws)" ;;
  *) echo "check-workspace: blocked (validator exit $code on $ws)"; code=2 ;;
esac
exit "$code"
