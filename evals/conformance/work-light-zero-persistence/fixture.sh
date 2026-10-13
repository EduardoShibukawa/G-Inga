#!/usr/bin/env bash
# Scaffold: clean repo whose README carries one typo; no task or spec records.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
printf '\nYou will recieve a friendly greeting.\n' >> README.md
fx_commit
