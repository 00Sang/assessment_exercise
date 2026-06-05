#!/usr/bin/env bash
# Uninstall assessment_exercise, remove test data, and drop the app symlink.
# Use this to simulate a fresh git pull + install workflow.
# Usage: ./scripts/reset-bench-for-fresh-setup.sh /path/to/frappe-bench [site-name] [academic-year]

set -euo pipefail

BENCH_PATH="${1:-}"
SITE_NAME="${2:-school.localhost}"
ACADEMIC_YEAR="${3:-2025-26}"

if [[ -z "${BENCH_PATH}" ]]; then
  echo "Usage: $0 /path/to/frappe-bench [site-name] [academic-year]"
  echo "Example: $0 ~/frappe-bench school.localhost 2025-26"
  exit 1
fi

if [[ ! -d "${BENCH_PATH}/apps" ]]; then
  echo "Error: ${BENCH_PATH} does not look like a Frappe bench (missing apps/)"
  exit 1
fi

cd "${BENCH_PATH}"

if bench --site "${SITE_NAME}" list-apps 2>/dev/null | grep -q "^assessment_exercise"; then
  echo "Removing exercise data from site ${SITE_NAME}..."
  bench --site "${SITE_NAME}" execute \
    assessment_exercise.assessment.services.master_data_seed_service.cleanup_exercise_data \
    --kwargs "{\"academic_year\": \"${ACADEMIC_YEAR}\"}" || true

  echo "Uninstalling assessment_exercise from site ${SITE_NAME}..."
  bench --site "${SITE_NAME}" uninstall-app assessment_exercise -y --no-backup
else
  echo "assessment_exercise is not installed on ${SITE_NAME}; skipping data cleanup and uninstall."
fi

TARGET="${BENCH_PATH}/apps/assessment_exercise"
if [[ -L "${TARGET}" ]] || [[ -d "${TARGET}" ]]; then
  echo "Removing ${TARGET}"
  rm -rf "${TARGET}"
fi

echo "Restarting bench..."
bench restart

echo ""
echo "Done. Bench is ready for a fresh setup:"
echo "  1. git clone / git pull your repo"
echo "  2. ./scripts/install-app-to-bench.sh ${BENCH_PATH} ${SITE_NAME}"
echo "  3. ./scripts/seed-master-data.sh ${BENCH_PATH} ${SITE_NAME} ${ACADEMIC_YEAR}"
echo "  4. cd frontend && yarn install && yarn dev"
