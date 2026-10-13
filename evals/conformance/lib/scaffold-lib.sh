# Shared scaffold helpers for evals/conformance cases. Sourced by each case's fixture.sh,
# which `claude plugin eval --scaffold` runs as `bash <case>/fixture.sh` with the empty run
# workspace as the working directory. Records are generated here at runtime, so no fixture
# task or spec Markdown lives in this repository (the repo validator scans every .md file).
set -euo pipefail

CONFORMANCE_LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$CONFORMANCE_LIB/../../.." && pwd)"
FIXTURE_DATE="2026-10-13"

# git with a fixed identity; the run's HOME is a fresh temporary directory.
fx_git() {
  git -c user.name="Eval Fixture" -c user.email="fixture@example.invalid" -c commit.gpgsign=false \
    -c init.defaultBranch=main "$@"
}

# Minimal product repository: README, a tiny module, the real standalone validator behind a
# logging shim, and a manifest covering the validator so manifest-integrity can pass.
fx_init_repo() {
  local real="$REPO_ROOT/tools/validate/validate.js"
  [[ -f "$real" ]] || { echo "fixture: validator not found at $real" >&2; exit 1; }
  mkdir -p tools/validate src tasks specs
  cp "$real" tools/validate/validate.real.mjs
  cp "$CONFORMANCE_LIB/validator-wrapper.cjs" tools/validate/validate.js
  printf 'import "./validate.js";\n' > tools/validate/validate.ts
  local hash
  hash="$(sha256sum tools/validate/validate.real.mjs | cut -d' ' -f1)"
  printf '{\n  "release": "0.0.0-fixture",\n  "files": {\n    "tools/validate/validate.real.mjs": "%s"\n  }\n}\n' "$hash" > manifest.json
  printf '.eval/\n' > .gitignore
  cat > README.md <<'EOF'
# greet

Tiny command-line greeter used as an evaluation fixture.

Run `node src/greet.js <name>` to print a greeting.

Validate records with `node tools/validate/validate.js`.
EOF
  cat > src/greet.js <<'EOF'
#!/usr/bin/env node
// Prints a greeting for the name given as the first argument.
const name = process.argv[2] ?? "world";
console.log(`Hello, ${name}`);
EOF
  touch tasks/.gitkeep specs/.gitkeep
}

fx_commit() {
  fx_git init -q
  fx_git add -A
  fx_git commit -q -m "${1:-fixture: initial state}"
  # Leave a local identity so the agent can commit inside the workspace.
  git config user.name "Eval Fixture"
  git config user.email "fixture@example.invalid"
  git config commit.gpgsign false
}

# fx_task <id> <tier> <status> [extra frontmatter lines] — writes a minimal task/1 record
# following docs/artifact-contracts.md §3.2. Optional env: FX_TITLE, FX_SCOPE, FX_ROUTING
# (extra log bullets), FX_SECTIONS (extra sections appended after ## Verification).
fx_task() {
  local id="$1" tier="$2" status="$3" extra="${4:-}"
  local scope="${FX_SCOPE:-src/greet.js}"
  {
    printf -- '---\nschema: task/1\ntier: %s\nstatus: %s\n' "$tier" "$status"
    [[ -n "$extra" ]] && printf '%s\n' "$extra"
    printf -- '---\n\n# %s\n\n' "${FX_TITLE:-Fixture task $id}"
    printf '## Routing and approvals\n\n- tier: %s (fixture)\n' "$tier"
    [[ -n "${FX_ROUTING:-}" ]] && printf '%s\n' "$FX_ROUTING"
    printf '\n'
    printf '## Objective\n\nFixture objective for %s.\n\n- In scope: `%s`\n- Out of scope: everything else\n\n' "$id" "$scope"
    printf '## Acceptance criteria\n\n- AC1: the fixture behavior for %s holds.\n\n' "$id"
    printf '## Verification\n\n| ID | Check | Result | Ref | Note |\n|---|---|---|---|---|\n'
    printf '| B1 | fixture baseline | not run | %s | no relevant check exists |\n' "${FX_BASE_REF:-0000000}"
    if [[ -n "${FX_SECTIONS:-}" ]]; then
      printf '\n%s\n' "$FX_SECTIONS"
    fi
  } > "tasks/$id.md"
}

# fx_spec <id> <status> <version> — writes a minimal spec/1 record (§4). Optional env:
# FX_SPEC_EXTRA (extra frontmatter lines).
fx_spec() {
  local id="$1" status="$2" version="$3"
  {
    printf -- '---\nschema: spec/1\nstatus: %s\nversion: %s\n' "$status" "$version"
    [[ -n "${FX_SPEC_EXTRA:-}" ]] && printf '%s\n' "$FX_SPEC_EXTRA"
    printf -- '---\n\n# %s\n\n' "${FX_SPEC_TITLE:-Fixture spec $id}"
    printf '## Problem\n\nFixture problem statement (H3 holds).\n\n'
    printf '## Expected behavior\n\nFixture expected behavior.\n\n'
    printf '## Scope\n\n- In scope: the greeter.\n- Out of scope: everything else.\n\n'
    printf '## Acceptance criteria\n\n- **SC1:** the fixture behavior holds end to end.\n\n'
    printf '## Interfaces and dependencies\n\nnone: fixture.\n\n'
    printf '## Decisions\n\nFixture decision.\n\n'
    printf '## Risks and constraints\n\nNone beyond the fixture.\n\n'
    printf '## Verification\n\nEnd to end check of SC1.\n\n'
    printf '## Rollback\n\nskip: no one-way door.\n\n'
    printf '## Open questions\n\n- Which output format should the greeting use? (open, owner call)\n\n'
    printf '## Revisions\n\n- v1: initial draft.\n'
  } > "specs/$id.md"
}
