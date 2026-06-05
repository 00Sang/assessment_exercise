# Assessment Scheme Builder (Take-home)

Working prototype of a CBSE Class VI–VIII assessment scheme configuration module: Frappe Education backend APIs + React SPA.

See the full brief in [`docs/CANDIDATE_EXERCISE_ASSESSMENT_SCHEME.md`](docs/CANDIDATE_EXERCISE_ASSESSMENT_SCHEME.md).

## What's inside

| Path | Purpose |
|------|---------|
| `backend/` | Frappe app root (symlink to bench `apps/assessment_exercise`) |
| `backend/assessment_exercise/` | Python package (APIs, hooks, services) |
| `frontend/` | React 19 + TypeScript + Vite UI |
| `scripts/` | Bench install and master-data seed helpers |
| `docs/` | Exercise spec and implementation notes |

## Prerequisites

- **Frappe v15 bench** with site `school.localhost` (or adjust URLs below)
- **Frappe Education** app installed on that site
- **Node.js 20+** and **Yarn** for the frontend
- **Python 3.10+** and **ruff** for backend lint (`pip install ruff`)

### Quick Frappe bench (Docker)

```bash
git clone https://github.com/frappe/frappe_docker
cd frappe_docker
docker compose -f pwd.yml up -d
# Site is typically school.localhost:8000 — install education on the bench first
```

## Reset bench (test fresh pull)

To uninstall the app, delete exercise test data, and remove the symlink (simulate a clean clone):

```bash
cd /path/to/assessment_exercise
chmod +x scripts/reset-bench-for-fresh-setup.sh
./scripts/reset-bench-for-fresh-setup.sh /path/to/frappe-bench school.localhost 2025-26
```

Then follow **Setup** below from step 1.

## Setup

### 1. Install the backend app

From your **frappe-bench** directory:

```bash
ln -sf /path/to/assessment-scheme-builder-exercise/backend apps/assessment_exercise
bench --site school.localhost install-app assessment_exercise
bench restart
```

Or use the helper script (recommended). **Run these from the project root** — the folder that contains `backend/`, `frontend/`, and `scripts/` (not from inside `frontend/` or your frappe-bench):

```bash
# 1. Clone the repo (first time only)
git clone https://github.com/00Sang/assessment_exercise.git
cd assessment_exercise

# If you already have the repo, go to its root:
# cd /path/to/assessment-scheme-builder-exercise

# 2. Make the script executable (first time only)
chmod +x scripts/install-app-to-bench.sh

# 3. Install — pass your bench path and site name as arguments
./scripts/install-app-to-bench.sh /path/to/frappe-bench school.localhost
```

Example with typical paths:

```bash
cd ~/assessment_exercise
./scripts/install-app-to-bench.sh ~/frappe-bench school.localhost
```

The script links `backend/` into `frappe-bench/apps/assessment_exercise`, runs `install-app`, and restarts bench. Ensure `bench start` is running (or start it after install).

**Requires:** Frappe Education app on the same site (`bench get-app education && bench --site school.localhost install-app education`).

### 2. Seed master data

Programs, courses, academic year/terms, and student groups must exist before saving plans:

From the **same project root** as above:

```bash
chmod +x scripts/seed-master-data.sh
./scripts/seed-master-data.sh /path/to/frappe-bench school.localhost 2025-26
```

Example:

```bash
cd ~/assessment_exercise
./scripts/seed-master-data.sh ~/frappe-bench school.localhost 2025-26
```

The seed is idempotent (safe to run twice).

**Grading scales** are not seeded. Add these in Frappe Desk if plan save fails:

- Default Scholastic Grading Scale
- Co-scholastic 5-Point Scale

### 3. Start the frontend

From the project root, open a **new terminal** (keep `bench start` running in the first):

```bash
cd /path/to/assessment_exercise/frontend
# or: cd frontend   (if you are already in the project root)

yarn install   # first time only
yarn dev
```

Open http://localhost:5173. API calls proxy to `http://school.localhost:8000` (see `frontend/vite.config.ts`).

Log in with your Frappe credentials when prompted (the UI requires an active session).

## Run / smoke test

```bash
# Backend ping (from bench)
bench --site school.localhost execute assessment_exercise.api.ping

# Or via HTTP (after logging into Desk to obtain session cookie)
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.ping' | jq
```

Expected: `{"message": {"success": true, "data": {"message": "pong"}}}`

### API examples (curl)

Authenticate first (`curl -c cookies.txt -X POST .../api/method/login`). Then:

```bash
# List assessment criteria
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_assessment_criteria' | jq

# Get assessment group tree
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_assessment_groups&academic_year=2025-26' | jq

# Save assessment plan
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.save_assessment_plan' \
  -H 'Content-Type: application/json' \
  -d '{"payload": {"assessmentName": "English Internal Assessment", "program": "Class VI", "studentGroup": "Class VI", "course": "English", "assessmentGroup": "internal-1", "gradingScale": "Default Scholastic Grading Scale", "academicYear": "2025-26", "academicTerm": "Term I", "schedule": {"date": "2025-09-01", "fromTime": "09:00", "toTime": "12:00"}, "maximumAssessmentScore": 20, "criteria": [{"assessmentCriteria": "PT Internal", "maxMarks": 5}, {"assessmentCriteria": "Multiple Assessment (MA)", "maxMarks": 5}, {"assessmentCriteria": "Subject Enrichment (SEA)", "maxMarks": 5}, {"assessmentCriteria": "Portfolio", "maxMarks": 5}]}}' | jq

# List plans
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.list_assessment_plans' | jq
```

More curl examples: [`backend/assessment_exercise/assessment/README.md`](backend/assessment_exercise/assessment/README.md).

## App workflow

1. **Assessment Criteria** — configure criteria names
2. **Assessment Group** — set up term / exam-type tree for the academic year
3. **Assessment Plan** — create plans, or click **Edit** on a saved plan to update marks and criteria
4. **Term Scheme** — view configured scheme with validation summary

## Lint

```bash
# Python (from repo root)
ruff check backend

# TypeScript
cd frontend && yarn lint
```

## Frontend stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui (nova preset)
- `frappe-react-sdk` for Frappe API + auth

Details: [`frontend/README.md`](frontend/README.md).
