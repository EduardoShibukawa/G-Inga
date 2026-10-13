#!/usr/bin/env bash
# Scaffold: two independent open tasks whose declared scopes collide on src/greet.js.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
FX_TITLE="Add shout option" fx_task "$FIXTURE_DATE-add-shout-option" standard active
FX_TITLE="Add farewell option" fx_task "$FIXTURE_DATE-add-farewell-option" standard active
fx_commit
