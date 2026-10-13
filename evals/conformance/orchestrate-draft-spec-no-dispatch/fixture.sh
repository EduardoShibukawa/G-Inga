#!/usr/bin/env bash
# Scaffold: confirmed heavy parent whose spec is still a draft; no children exist yet.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
id="$FIXTURE_DATE-greeting-formats"
FX_SPEC_TITLE="Greeting formats" fx_spec "$id" draft 1
FX_TITLE="Greeting formats" FX_SCOPE="src/" \
  FX_ROUTING="- confirmed: heavy by owner ($FIXTURE_DATE, \"go heavy\")" \
  FX_SECTIONS="## Plan

1. Run the question rounds and finish the spec draft.
2. Owner approves the spec.
3. Decompose into children: plain, formal and shout greeting formats.

## Review

No findings yet: the review runs after the children are verified." \
  fx_task "$id" heavy active "spec: $id@1"
fx_commit
