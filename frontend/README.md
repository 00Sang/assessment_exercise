# Frontend — Assessment Scheme Builder

React 19 + TypeScript + Vite + Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com) (radix-nova preset).

## Quick start

```bash
cd frontend
yarn install
yarn dev
```

Open http://localhost:5173. API calls proxy to `http://school.localhost:8000` (see `vite.config.ts`).

Log in with Frappe credentials when prompted. The backend must be running with master data seeded — see the [root README](../README.md).

### Environment

`frontend/.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_FRAPPE_URL` | `http://school.localhost:8000` | Frappe site URL |
| `VITE_FRAPPE_SITE_NAME` | `school.localhost` | Site name for SDK |
| `VITE_ENABLE_SOCKET` | `false` | Disable realtime socket (unused by this UI) |

### WebSocket / Socket.IO console errors

If you see `WebSocket connection to 'ws://localhost:9000/socket.io/...' failed`:

1. Keep `VITE_ENABLE_SOCKET=false` in `frontend/.env` (default).
2. This app does not use Frappe realtime events.

## App tabs

| Tab | Page | Purpose |
|-----|------|---------|
| 01 | `assessment-criteria-page.tsx` | CRUD assessment criteria |
| 02 | `assessment-group-page.tsx` | Term / exam-type tree |
| 03 | `plan-form-page.tsx` | Create and edit assessment plans |
| 04 | `term-scheme-page.tsx` | Scheme view with validation |

## Validation

Client-side CBSE rules live in:

- `src/lib/validate-assessment-plan-form.ts` — plan form (PT caps, internal totals, co-scholastic)
- `src/lib/validate-term-scheme.ts` — term scheme completeness

## Lint

```bash
yarn lint
```

## Project structure

```
src/
├── components/
│   ├── auth/                  # Login gate
│   ├── layout/app-shell.tsx   # Header + main + footer
│   └── ui/                    # shadcn primitives
├── lib/
│   ├── assessment-api-methods.ts
│   ├── frappe-api.ts
│   └── validate-assessment-plan-form.ts
├── pages/
│   ├── assessment-criteria-page.tsx
│   ├── assessment-group-page.tsx
│   ├── plan-form-page.tsx
│   └── term-scheme-page.tsx
└── main.tsx
```
