#!/usr/bin/env bash
# Install assessment_exercise into a Frappe bench.
# Usage: ./scripts/install-app-to-bench.sh /path/to/frappe-bench [site-name]

set -euo pipefail

BENCH_PATH="${1:-}"
SITE_NAME="${2:-school.localhost}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_SRC="${REPO_ROOT}/backend"

if [[ -z "${BENCH_PATH}" ]]; then
  echo "Usage: $0 /path/to/frappe-bench [site-name]"
  echo "Example: $0 ~/frappe-bench school.localhost"
  exit 1
fi

if [[ ! -d "${BENCH_PATH}/apps" ]]; then
  echo "Error: ${BENCH_PATH} does not look like a Frappe bench (missing apps/)"
  exit 1
fi

TARGET="${BENCH_PATH}/apps/assessment_exercise"

if [[ -L "${TARGET}" ]] || [[ -d "${TARGET}" ]]; then
  echo "Removing existing ${TARGET}"
  rm -rf "${TARGET}"
fi

echo "Linking ${APP_SRC} -> ${TARGET}"
ln -sf "${APP_SRC}" "${TARGET}"

cd "${BENCH_PATH}"

echo "Installing app on site ${SITE_NAME}..."
bench --site "${SITE_NAME}" install-app assessment_exercise

echo "Restarting bench..."
bench restart

echo "Done. Test with:"
echo "  bench --site ${SITE_NAME} execute assessment_exercise.api.ping"
