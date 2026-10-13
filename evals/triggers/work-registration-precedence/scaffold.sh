#!/usr/bin/env bash
# Stage the project registration of `work` inside the eval sandbox cwd.
# Runs only with `claude plugin eval --scaffold`; cwd is the sandbox workspace.
set -euo pipefail
case_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$case_dir/../../.." && pwd)"
mkdir -p .claude/skills
cp -R "$repo_root/.claude/skills/work" .claude/skills/work
printf 'Sample README with a typo: recieve.\n' > README.md
