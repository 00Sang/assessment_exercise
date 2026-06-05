# assessment_exercise (Frappe app)

Installable Frappe app for the Assessment Scheme Builder exercise.

Symlink this **`backend/`** directory into your bench as `apps/assessment_exercise`.

## Install on your bench

From your **frappe-bench** directory:

```bash
# Option A: symlink (recommended for development)
ln -sf /path/to/assessment-scheme-builder-exercise/backend apps/assessment_exercise

# Option B: copy
cp -r /path/to/assessment-scheme-builder-exercise/backend apps/assessment_exercise

# Install on your site (replace with your site name)
bench --site school.localhost install-app assessment_exercise

# Restart
bench restart
```

Or from the repo root:

```bash
./scripts/install-app-to-bench.sh /path/to/frappe-bench school.localhost
```

Verify:

```bash
bench --site school.localhost execute assessment_exercise.api.ping
# or
curl -s 'http://school.localhost:8000/api/method/assessment_exercise.api.ping' -b cookies.txt
```

Expected: `{"message": {"success": true, "data": {"message": "pong"}}}`

## Prerequisites

- Frappe v15 bench
- **education** app installed on the same site (`bench get-app education && bench --site <site> install-app education`)

## App structure

```
backend/                          # Frappe app root → apps/assessment_exercise
  pyproject.toml
  assessment_exercise/            # Python package
    api.py                        # re-exports assessment.api
    hooks.py
    modules.txt
    assessment/                   # API + services module
      api.py
      services/
      utils/
      validation/
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `App assessment_exercise is not installed` | Run `bench --site <site> install-app assessment_exercise` |
| `App education is not installed` | Install Frappe Education first |
| `ModuleNotFoundError: assessment_exercise` | Symlink `backend/` (not `backend/assessment_exercise/`) to `apps/assessment_exercise`, then run `bench setup requirements` |

See also [assessment/README.md](assessment_exercise/assessment/README.md) for API curl examples.
