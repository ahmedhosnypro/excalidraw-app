#!/usr/bin/env bash
# Quality gate — runs all checks in the required order. Warnings are treated as
# failures (per project policy). Exits non-zero on the first tool that reports
# any issue so the pre-commit hook blocks the commit.
set -euo pipefail

# Ensure local binaries are resolvable whether run via husky or directly.
export PATH="$PWD/node_modules/.bin:$PATH"

echo "────────────────────────────────────────────────────────────────"
echo "▶ 1/6  tsgo — TypeScript type check"
echo "────────────────────────────────────────────────────────────────"
tsgo --noEmit

echo "────────────────────────────────────────────────────────────────"
echo "▶ 2/6  oxlint — fast linter (--deny-warnings)"
echo "────────────────────────────────────────────────────────────────"
oxlint --deny-warnings .

echo "────────────────────────────────────────────────────────────────"
echo "▶ 3/6  biome — formatter + linter (--error-on-warnings)"
echo "────────────────────────────────────────────────────────────────"
biome check --error-on-warnings .

echo "────────────────────────────────────────────────────────────────"
echo "▶ 4/6  eslint --max-warnings 0"
echo "────────────────────────────────────────────────────────────────"
eslint --max-warnings 0 .

echo "────────────────────────────────────────────────────────────────"
echo "▶ 5/6  jscpd — copy/paste detector (fails on ANY duplicate)"
echo "────────────────────────────────────────────────────────────────"
jscpd .
node -e 'try{const r=require("./report/jscpd-report.json");const n=(r.duplicates||[]).length;if(n>0){console.error("\njscpd: "+n+" duplicate block(s) detected — refactor to remove duplication.");process.exit(1)}console.log("jscpd: 0 duplicate blocks")}catch(e){console.log("jscpd: no report generated (nothing to analyse)")}'

echo "────────────────────────────────────────────────────────────────"
echo "▶ 6/6  knip — unused exports, files & dependencies"
echo "────────────────────────────────────────────────────────────────"
# Run knip under the Bun runtime — the Node build of `knip` triggers an
# oxc-parser ~6 GiB ArrayBuffer allocation that this sandbox disallows.
# `knip-bun` (shipped by knip) runs cleanly under Bun with no such buffer.
bun node_modules/knip/bin/knip-bun.js --no-progress --no-config-hints

echo "────────────────────────────────────────────────────────────────"
echo "✅  Quality gate passed — all checks clean (0 warnings, 0 errors)"
echo "────────────────────────────────────────────────────────────────"
