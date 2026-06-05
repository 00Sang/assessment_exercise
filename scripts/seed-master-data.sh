#!/usr/bin/env bash
# Seed Frappe Education master data (programs, courses, year, terms, student groups).
# Usage: ./scripts/seed-master-data.sh /path/to/frappe-bench [site-name] [academic-year]

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

echo "Seeding master data on site ${SITE_NAME} (academic year ${ACADEMIC_YEAR})..."
bench --site "${SITE_NAME}" execute assessment_exercise.assessment.services.master_data_seed_service.seed_master_data \
  --kwargs "{\"academic_year\": \"${ACADEMIC_YEAR}\"}"

echo "Done. Verify in Desk: Education > Program, Course, Student Group."
