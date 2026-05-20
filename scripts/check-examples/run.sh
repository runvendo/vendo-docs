#!/usr/bin/env bash
# docs-examples-ci — extract every python/typescript fenced block from
# content/docs/cookbook into scripts/check-examples/.tmp, then check:
#   - Python: ruff (syntax + undefined names + unused imports). No SDK
#     install required — we only catch user-side bugs. Tighten to mypy
#     once vendo-sdk-py ships a py.typed marker.
#   - TypeScript: tsc --strict against @vendodev/sdk built from main. Catches
#     missing methods, wrong field shapes, signature drift.
#
# The TS path clones vendo-sdk-js and runs `npm run build` to produce dist/.
# Pinning to main (not a published version) lets docs sync to in-flight SDK
# changes without waiting for npm publish. Once tag→publish stabilises this
# can switch to `@vendodev/sdk@^1.x` from the registry.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
script_dir="$repo_root/scripts/check-examples"
out_dir="$script_dir/.tmp"
sdk_clone="$script_dir/.vendor/vendo-sdk-js"

cd "$repo_root"

echo "==> extracting code blocks"
node "$script_dir/extract.mjs" content/docs/cookbook "$out_dir"

py_count=0
ts_count=0
[ -d "$out_dir/python" ] && \
  py_count=$(find "$out_dir/python" -maxdepth 1 -name '*.py' -type f | wc -l | tr -d ' ')
[ -d "$out_dir/typescript" ] && \
  ts_count=$(find "$out_dir/typescript" -maxdepth 1 -name '*.ts' -type f | wc -l | tr -d ' ')

python_ok=1
typescript_ok=1

if [ "$py_count" -gt 0 ]; then
  echo "==> checking python ($py_count files)"
  if ! command -v ruff >/dev/null 2>&1; then
    python3 -m pip install --quiet --user ruff
    export PATH="$(python3 -m site --user-base)/bin:$PATH"
  fi
  if ! ruff check --no-cache --select=F401,F811,F821,F823,F841 \
        "$out_dir/python"; then
    python_ok=0
  fi
else
  echo "==> no python blocks to check"
fi

if [ "$ts_count" -gt 0 ]; then
  echo "==> checking typescript ($ts_count files)"
  mkdir -p "$(dirname "$sdk_clone")"
  if [ ! -d "$sdk_clone/.git" ]; then
    git clone --depth 1 https://github.com/runvendo/vendo-sdk-js.git "$sdk_clone"
  else
    (cd "$sdk_clone" && git fetch --depth 1 origin main && git reset --hard origin/main)
  fi
  if [ ! -d "$sdk_clone/dist" ]; then
    (cd "$sdk_clone" && npm install --no-audit --no-fund --silent && npm run build --silent)
  fi
  (
    cd "$script_dir"
    if [ ! -d node_modules ] || [ ! -d node_modules/@vendodev/sdk/dist ]; then
      [ -f package.json ] || npm init -y >/dev/null
      npm install --no-audit --no-fund --silent typescript "file:$sdk_clone"
    fi
    npx tsc --project tsconfig.json
  ) || typescript_ok=0
else
  echo "==> no typescript blocks to check"
fi

if [ "$python_ok" -eq 1 ] && [ "$typescript_ok" -eq 1 ]; then
  echo "OK: all checks passed"
  exit 0
fi
echo "FAIL: python=$([ $python_ok -eq 1 ] && echo ok || echo fail) typescript=$([ $typescript_ok -eq 1 ] && echo ok || echo fail)"
exit 1
