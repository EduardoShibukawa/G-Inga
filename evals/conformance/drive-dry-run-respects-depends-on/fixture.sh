#!/usr/bin/env bash
# Scaffold: backlog with an eligible task and a task whose dependency is not yet verified.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
FX_TITLE="Add shout option" fx_task "$FIXTURE_DATE-add-shout-option" standard active
FX_TITLE="Document shout option" FX_SCOPE="README.md" fx_task "$FIXTURE_DATE-document-shout-option" standard todo \
  "depends_on:
  - $FIXTURE_DATE-add-shout-option"
fx_commit
