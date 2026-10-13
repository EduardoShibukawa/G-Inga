#!/usr/bin/env bash
# Scaffold: backlog where nothing is runnable: one task is blocked, the other depends on it.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
FX_TITLE="Choose greeting language" FX_SECTIONS="## Blockers

- The owner has not chosen the default greeting language (English or Portuguese). Needed from: owner." \
  fx_task "$FIXTURE_DATE-greeting-language" standard blocked
FX_TITLE="Translate greeting" fx_task "$FIXTURE_DATE-translate-greeting" standard todo \
  "depends_on:
  - $FIXTURE_DATE-greeting-language"
fx_commit
