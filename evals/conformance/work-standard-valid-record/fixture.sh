#!/usr/bin/env bash
# Scaffold: clean repo with the greeter and no records; the agent creates the first one.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
fx_commit
