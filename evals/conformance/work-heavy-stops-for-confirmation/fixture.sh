#!/usr/bin/env bash
# Scaffold: clean repo plus a small auth module so a credential-migration request is plausible.
source "$(dirname "${BASH_SOURCE[0]}")/../lib/scaffold-lib.sh"
fx_init_repo
cat > src/auth.js <<'JS'
// Stores and checks user passwords. Hashes are kept in data/users.json.
const { createHash } = require("node:crypto");
exports.hash = (password) => createHash("sha1").update(password).digest("hex");
exports.check = (password, stored) => exports.hash(password) === stored;
JS
mkdir -p data
printf '{ "alice": "%s" }\n' "$(printf 'secret' | sha1sum | cut -d' ' -f1)" > data/users.json
fx_commit
