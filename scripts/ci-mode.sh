#!/usr/bin/env bash
# Switch this branch's CI outcome. Commit and push the result to the PR branch.
#   scripts/ci-mode.sh green
#   scripts/ci-mode.sh red
#   scripts/ci-mode.sh slow [minutes]   (default 20)
#   scripts/ci-mode.sh absent           (removes the workflow on this branch)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

workflow=.github/workflows/ci.yml
mode=${1:-}

restore_workflow() {
  if [ ! -f "$workflow" ]; then
    git checkout origin/main -- "$workflow"
  fi
}

case "$mode" in
  green|red)
    restore_workflow
    echo "$mode" > .ci-mode
    ;;
  slow)
    minutes=${2:-20}
    [[ "$minutes" =~ ^[0-9]+$ ]] || { echo "minutes must be a whole number" >&2; exit 1; }
    restore_workflow
    echo "slow $minutes" > .ci-mode
    ;;
  absent)
    git rm -q --ignore-unmatch "$workflow"
    echo absent > .ci-mode
    ;;
  *)
    echo "usage: $0 green|red|slow [minutes]|absent" >&2
    exit 1
    ;;
esac

git add .ci-mode "$workflow" 2>/dev/null || git add .ci-mode
echo "CI mode set to: $(cat .ci-mode). Commit and push to apply."
