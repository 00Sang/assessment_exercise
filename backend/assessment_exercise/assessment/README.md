# Assessment Module — Frappe Backend

Python API layer for the Assessment Scheme Builder exercise. Copy this folder into your Frappe bench app.

## Copy into Frappe bench

**Recommended:** symlink the app root at [`backend/`](../../):

```bash
# From your bench directory
ln -sf /path/to/assessment-scheme-builder-exercise/backend apps/assessment_exercise
bench --site school.localhost install-app assessment_exercise
bench restart
```

Or run from the repo:

```bash
./scripts/install-app-to-bench.sh /path/to/frappe-bench school.localhost
```

### Manual copy (alternative)

If you only have the `assessment/` module folder:

```bash
cp -r /path/to/assessment-scheme-builder-exercise/backend/assessment_exercise/assessment \
  apps/assessment_exercise/assessment_exercise/assessment

cp backend/assessment_exercise/assessment/ROOT_API_REEXPORT.py \
  apps/assessment_exercise/assessment_exercise/api.py

bench --site school.localhost install-app assessment_exercise
bench restart
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `App assessment_exercise is not installed` | Run `bench --site <site> install-app assessment_exercise` |
| `App education is not installed` | Run `bench --site <site> install-app education` first |

## Prerequisites (Frappe Education master data)

These DocTypes must exist before plan save works:

| DocType | Example records |
|---------|-----------------|
| Program | Class VI, Class VII, Class VIII |
| Course | English, Mathematics, Science, … |
| Student Group | Class VI, Class VII, Class VIII |
| Academic Year | 2025-26 |
| Academic Term | Term I, Term II |
| Grading Scale | Default Scholastic Grading Scale, Co-scholastic 5-Point Scale |

Assessment Criteria and Assessment Groups are created via the UI tabs / APIs in this module.

## Seed master data (required before saving plans)

Static class/subject dropdowns in the React UI are **labels only**. Frappe still needs real `Program`, `Course`, `Student Group`, `Academic Year`, and `Academic Term` documents before `save_assessment_plan` can succeed.

### Option A — bench execute (recommended)

From your bench:

```bash
bench --site school.localhost execute \
  assessment_exercise.assessment.services.master_data_seed_service.seed_master_data \
  --kwargs '{"academic_year": "2025-26"}'
```

Or from this repo:

```bash
chmod +x scripts/seed-master-data.sh
./scripts/seed-master-data.sh /path/to/frappe-bench school.localhost 2025-26
```

The seed is **idempotent** (safe to run twice). It creates:

| DocType | Records |
|---------|---------|
| Department | CBSE |
| Program | Class VI, Class VII, Class VIII |
| Course | All subjects from `constants.py` |
| Academic Year | 2025-26 (default) |
| Academic Term | Term I, Term II |
| Student Group | Class VI, Class VII, Class VIII (one per program, no batch) |

**Grading Scale** is not auto-created. If plan save fails on grading scale, add **Default Scholastic Grading Scale** and **Co-scholastic 5-Point Scale** in Desk (or import Education demo data).

### Option B — HTTP API

```bash
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.seed_master_data' \
  -d 'academic_year=2025-26' | jq
```

## API endpoints

All endpoints return:

```json
{ "success": true, "data": { ... } }
```

or:

```json
{ "success": false, "error": "reason" }
```

Frappe wraps the response in `message`, so the frontend receives `response.message.data`.

### Smoke test

```bash
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.ping' | jq
```

### Tab 01 — Assessment Criteria

```bash
# List
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_assessment_criteria' | jq

# Create
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.create_assessment_criteria' \
  -d 'criteria_name=Theory&assessment_criteria_group=Theory' | jq

# Update (safe replace)
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.update_assessment_criteria' \
  -d 'old_name=Theory&new_name=Theory Exam' | jq

# Delete
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.delete_assessment_criteria' \
  -d 'criteria_name=Theory Exam' | jq
```

### Tab 02 — Assessment Group

```bash
# Get tree for academic year
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_assessment_groups&academic_year=2025-26' | jq

# Bulk create from UI payload
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.bulk_create_assessment_groups' \
  -d 'rows=[{"academicYear":"2025-26","term":"Term I","examName":"PT-I","displayName":"2025-26 + Term I + PT-I"}]' | jq

# Delete leaf
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.delete_assessment_group' \
  -d 'assessment_group_name=PT-I' | jq
```

### Tab 03 — Assessment Plan

```bash
# Save plan
curl -s -b cookies.txt -X POST \
  'http://school.localhost:8000/api/method/assessment_exercise.api.save_assessment_plan' \
  -H 'Content-Type: application/json' \
  -d '{
    "payload": {
      "assessmentName": "English Internal Assessment",
      "program": "VI",
      "studentGroup": "VI",
      "course": "english",
      "assessmentGroup": "internal-1",
      "gradingScale": "Default Scholastic Grading Scale",
      "academicYear": "2025-26",
      "academicTerm": "Term I",
      "schedule": { "date": "2025-09-01", "fromTime": "09:00", "toTime": "12:00" },
      "maximumAssessmentScore": 20,
      "criteria": [
        { "assessmentCriteria": "PT Internal", "maxMarks": 5 },
        { "assessmentCriteria": "Multiple Assessment (MA)", "maxMarks": 5 },
        { "assessmentCriteria": "Subject Enrichment (SEA)", "maxMarks": 5 },
        { "assessmentCriteria": "Portfolio", "maxMarks": 5 }
      ]
    }
  }' | jq

# Get plan detail
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_assessment_plan_detail&student_group=VI&course=english&assessment_group=internal-1&academic_year=2025-26&academic_term=Term I' | jq

# List plans
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.list_assessment_plans&program=VI&academic_year=2025-26&academic_term=Term I' | jq
```

### Tab 04 — Term Scheme

```bash
# Term scheme (groups + plan snapshots)
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_term_scheme&program=VI&academic_year=2025-26&term_id=term-1' | jq

# Full nested scheme tree
curl -s -b cookies.txt \
  'http://school.localhost:8000/api/method/assessment_exercise.api.get_assessment_scheme&program=VI&academic_year=2025-26' | jq
```

## Module structure

| File | Purpose |
|------|---------|
| `api.py` | Whitelisted HTTP handlers |
| `constants.py` | Slug → Frappe name maps |
| `utils/api_response.py` | `{success, data}` envelope |
| `utils/slug_resolver.py` | Resolve slugs to DocType names |
| `validation/plan_validation.py` | Server-side CBSE rules |
| `services/assessment_criteria_service.py` | Criteria CRUD |
| `services/assessment_group_service.py` | Group tree CRUD |
| `services/assessment_plan_service.py` | Plan save/detail/list |
| `services/term_scheme_service.py` | Term scheme aggregation |

## Notes

- **Assessment Criteria rename**: Frappe Education disables rename on this doctype. The API uses safe replace (delete + create) when not linked to plans.
- **Assessment Group tree**: Year → Term → Exam type hierarchy under `All Assessment Groups`.
- **Plan upsert key**: `(student_group, course, assessment_group, academic_year, academic_term)`.
