# Technical Exercise: Assessment Scheme Builder
## Candidate Take-Home Project

---

## Overview

You are being asked to build a **working prototype** of an Assessment Scheme configuration module. This exercise mirrors a real subsystem used in our production school management platform.

### What Frappe Education already provides

**Frappe Education ships with the full doctype infrastructure for assessments out of the box.** The doctypes — `Assessment Group`, `Assessment Criteria`, `Assessment Plan`, `Assessment Result`, `Program`, `Course`, `Grading Scale` — already exist and are ready to use. You do not need to design a data model from scratch.

What Frappe does **not** provide is:
- The actual assessment data for a specific school's scheme (the groups, criteria, and plans need to be created by your backend code)
- Any React-based UI for building or viewing an assessment scheme (Frappe's default UI is a generic form builder, not purpose-built for this workflow)

### Your job

1. **Backend**: Write Python API functions that create the correct `Assessment Groups`, `Assessment Criteria`, and `Assessment Plans` in Frappe's database for the CBSE Class VI–VIII scheme described below.
2. **Frontend**: Build a React UI that calls those APIs and lets a school administrator view and configure the assessment scheme — selecting classes, subjects, and assessment cycles, setting marks, and saving plans.

The goal is not to build something perfect — it is to demonstrate your ability to work with the Frappe backend, design clean APIs on top of existing doctypes, and build a functional React frontend that consumes them. Code quality, architecture decisions, and clarity of thought matter more than feature completeness.

**Estimated effort**: 6–10 hours  
**Submission**: Share a GitHub repository link with a short README explaining how to run it.

---

## About the Platform

Our product is a school management system built on top of the **Frappe Framework** and the **Frappe Education** app. It serves Indian schools (Pre-Primary through Class XII) with full NEP 2020 alignment, managing assessment hierarchies, grading, attendance, promotions, and reporting.

### Core Repositories and Frameworksgit clone https://github.com/frappe/frappe_docker
cd frappe_docker
docker compose -f pwd.yml up -d

| Component | Technology | Repository / Reference |
|---|---|---|
| Backend framework | **Frappe Framework** | https://github.com/frappe/frappe |
| Education data model | **Frappe Education** | https://github.com/frappe/education |
| Education docs | **Frappe Education Docs** | https://docs.frappe.io/education/introduction |
| ERP foundation | **ERPNext** | https://github.com/frappe/erpnext |
| Frontend | **React 19 + TypeScript + Vite** | Our custom SPA layer |
| Styling | **Tailwind CSS v4 + Radix UI** | Class-based design tokens |
| Database | **MySQL / MariaDB** | Via Frappe ORM |
| Package manager | **Yarn** (not npm) | Frontend only |

> **Important**: Frappe Education already ships these doctypes — `Student`, `Program`, `Course`, `Assessment Plan`, `Assessment Result`, `Assessment Criteria`, `Assessment Group`, `Grading Scale`. You do not recreate them. Your job is to populate them with the correct data for the CBSE Class VI–VIII scheme, and build a React UI on top of the APIs you expose.

---

## The Domain: CBSE Assessment Scheme for Classes VI–VIII

Indian schools following the CBSE curriculum use a structured assessment scheme for Classes VI, VII, and VIII. Your task is to build a UI that lets a school administrator configure this scheme for an academic year.

---

### Overall Assessment Structure

The academic year is divided into **two terms**. Each term contains three assessment components per main subject: a Periodic Test (theory), an Internal Assessment, and a main theory exam.

**Assessment Components per Term:**

| Subject Type | Theory Exam | Internal Assessment | Main Exam |
|---|---|---|---|
| Main Subjects | PT (80 marks) | 20 marks | Half Yearly / Yearly (80 marks) |
| Skill Subjects | PT (50 marks) | 50 marks | — (no separate main exam) |
| School-Based | — | 5 marks (continuous) | — |

**Final result per term:**
- Main Subjects: Half Yearly / Yearly (80) + Internal (20) = **100 marks**
- Skill Subjects: Theory (50) + Internal (50) = **100 marks**
- School-Based: Internal (5) marks only

**End-of-session total (average of both terms):**
- Main Subjects: (Theory 160 ÷ 2 = 80) + (Internal 40 ÷ 2 = 20) = **100**
- Skill Subjects: (Theory 100 ÷ 2 = 50) + (Internal 100 ÷ 2 = 50) = **100**
- School-Based: (5 + 5) ÷ 2 = **5**

---

### Assessment Calendar

| Assessment | Approximate Window | Duration |
|---|---|---|
| PT-I (Periodic Test I) | June | ~8 days |
| Half Yearly Examination | September | ~9 days |
| PT-II (Periodic Test II) | December | ~8 days |
| Yearly Examination | February–March | ~9 days |

Internal assessments are evaluated **continuously throughout each term** — they are not a single sitting exam.

---

### Subject Categories and Marking Schemes

#### A. Main Subjects — Language (students choose ONE of three)

Options: **Hindi**, **Mizo**, **Manipuri**

The system must create assessment plans for all three language options to accommodate student choice, even though each student is enrolled in only one.

**Per-term assessment structure:**

| Assessment | Marks | Type |
|---|---|---|
| PT-I / PT-II | 80 | Pure theory exam |
| Internal Assessment | 20 | Computed (see breakdown below) |
| Half Yearly / Yearly | 80 | Pure theory exam — determines term result |

Pass criteria: **33% in theory** (≥ 26.4 / 80) AND **33% in internal** (≥ 6.6 / 20), independently.

---

#### B. Main Subjects — Core (all four compulsory)

Subjects: **English**, **Mathematics**, **Science**, **Social Science**

Identical marking structure to Language subjects above.

**Subject Enrichment Activity (SEA) varies by subject:**
- Mathematics & Science → Practical work
- Social Science → Map work, activities & projects
- Languages → ASL (Assessment of Speaking and Listening)

---

#### C. Skill Subjects

Subject: **Coding**

**Per-term assessment structure:**

| Assessment | Marks | Type |
|---|---|---|
| PT-I / PT-II (Theory) | 50 | Pure theory exam |
| Internal Assessment | 50 | Computed (see breakdown below) |

Pass criteria: **33% in theory** (≥ 16.5 / 50) AND **33% in internal** (≥ 16.5 / 50), independently.

---

#### D. School-Based Assessment (Co-scholastic)

Subjects: **Art Education**, **Life Skills**, **HPE & Work Experience**

| Component | Marks |
|---|---|
| Assessment per term | 5 (on a 5-point scale) |

Graded A–E. No numeric pass/fail — descriptive continuous evaluation only. No theory exams.

---

### Internal Assessment Breakdown

#### Main Subjects — 20 marks per term

| Sub-component | Marks | Description |
|---|---|---|
| PT Internal | 5 | Scaled from PT score (80 → 5) |
| Multiple Assessment (MA) | 5 | Unit tests, quizzes, class discussion |
| Subject Enrichment Activity (SEA) | 5 | Lab work, map work, ASL, projects |
| Portfolio | 5 | Student portfolio compilation |
| **Total** | **20** | |

#### Skill Subjects (Coding) — 50 marks per term

| Sub-component | Marks | Description |
|---|---|---|
| PT Internal | 5 | Scaled from PT score (50 → 5) |
| Multiple Assessment (MA) | 5 | Unit tests, quizzes, class discussion |
| Subject Enrichment Activity (SEA) | 5 | Coding-specific activities |
| Portfolio | 5 | Student portfolio compilation |
| Practical | 30 | Hands-on coding practical work |
| **Total** | **50** | |

---

### Assessment Plan Count Reference

Understanding the scale of what needs to be created will help you design your data model:

| Subject Category | Courses | Plans per Section | Notes |
|---|---|---|---|
| Language (3 options) | 3 | 6 each = 18 | PT + Internal + Main Exam × 2 terms |
| Core Main (4) | 4 | 6 each = 24 | Same structure |
| Skill (Coding) | 1 | 4 | PT + Internal × 2 terms (no separate main exam) |
| School-Based (3) | 3 | 2 each = 6 | Internal only × 2 terms |
| **Total per section** | **11** | **52** | |

For a typical school with 4 sections per class × 3 classes (VI, VII, VIII): **624 assessment plans** in total.

---

### Grading Scale (Scholastic — Main and Skill Subjects)

| Grade | Marks Range | Grade Point |
|---|---|---|
| A1 | 91–100 | 10 |
| A2 | 81–90 | 9 |
| B1 | 71–80 | 8 |
| B2 | 61–70 | 7 |
| C1 | 51–60 | 6 |
| C2 | 41–50 | 5 |
| D | 33–40 | 4 |
| E (Fail) | 0–32 | — |

---

## Your Task

Build a **working prototype** with a React frontend and a Python backend. The prototype must allow a school administrator to:

### Core Features (Required)

1. **Backend — seed the scheme data**: Write whitelisted Python functions that create the `Assessment Groups` (Term-I, PT-I, Half Yearly, etc.), `Assessment Criteria` (Theory 80, PT Internal 5, MA 5, SEA 5, Portfolio 5, Practical 30, etc.), and `Assessment Plans` that link a Program + Course + Assessment Group + Criteria together. Frappe's doctypes are already there — you are populating them.

2. **View the assessment scheme** for Classes VI, VII, and VIII as a structured list or tree.
   - Show the hierarchy: Term → Assessment Cycle → Subject → Criteria with max marks.
   - Data must come from the Frappe backend via API, not be hardcoded in the frontend.

3. **Create or configure an assessment plan** for a specific class, subject, and assessment cycle.
   - Select class (VI, VII, or VIII), subject, and assessment cycle (PT-I, Half Yearly, etc.).
   - Set the maximum marks for each criteria component.
   - Save the plan to the backend (persisted in Frappe's `Assessment Plan` doctype).

4. **Edit an existing assessment plan**.
   - Load a saved plan and update the marks or criteria.

4. **Validate the scheme rules**:
   - Warn if theory + internal marks do not add up to 100 for a Main or Skill Subject.
   - Prevent PT-I / PT-II from exceeding 80 marks for Main Subjects, 50 marks for Skill Subjects.
   - Internal Assessment sub-components for Main Subjects must sum to exactly 20 (PT 5 + MA 5 + SEA 5 + Portfolio 5).
   - Skill Subject internal components must sum to exactly 50 (PT 5 + MA 5 + SEA 5 + Portfolio 5 + Practical 30).
   - Co-scholastic subjects must use the 5-point scale only — no theory exam.
   - Language courses (Hindi / Mizo / Manipuri) must all carry identical marking structures (student chooses one, but all three must have plans).

### Stretch Features (Optional but impressive)

- A summary dashboard showing how many plans have been created vs. are still pending across all classes and subjects.
- Bulk-apply the same scheme across Class VI, VII, and VIII simultaneously.
- Export the scheme as a JSON file.

---

## Technical Requirements

### Backend

- Use **Python 3.10+** and the **Frappe Framework**.
- Expose at minimum these whitelisted API endpoints:

```
GET  /api/method/your_app.api.get_assessment_scheme        → list all plans
POST /api/method/your_app.api.save_assessment_plan         → create/update a plan
GET  /api/method/your_app.api.get_assessment_plan_detail   → get one plan
```

- Follow the standard Frappe return pattern:
  ```python
  return {"success": True, "data": result}
  # or
  return {"success": False, "error": "reason"}
  ```

- Use parameterized queries (no string interpolation in SQL).
- Wrap database mutations in try/except with `frappe.db.rollback()` on failure.

### Frontend

- React 19 + TypeScript.
- Use **Vite** as the build tool.
- Style with **Tailwind CSS** (v3 or v4).
- Use **`frappe-react-sdk`** (`useFrappeGetCall`, `useFrappePostCall`) for all API calls. This library handles CSRF tokens automatically.

  ```bash
  yarn add frappe-react-sdk
  ```

  > **Critical**: Frappe wraps all API responses in a `message` property. Always unwrap:
  > ```typescript
  > const { data } = useFrappeGetCall('your_app.api.get_assessment_scheme')
  > const actualData = (data as any)?.message ?? data
  > ```

- The frontend should be a single-page app served from Frappe's `www/` folder or via a Vite dev server proxied to Frappe.

### Data Model

You are free to use Frappe's existing Education doctypes or define your own simple JSON/dict storage. The important thing is that the data is persisted and the API can retrieve it.

Relevant existing doctypes to explore:

| Doctype | Purpose |
|---|---|
| `Assessment Group` | Hierarchy root — e.g., "Term-I", "PT-I" |
| `Assessment Criteria` | A single scored component — e.g., "Theory (80)" |
| `Assessment Plan` | Links a course + assessment group + criteria + max marks |
| `Program` | A class — e.g., "Class VI", "Class VII" |
| `Course` | A subject — e.g., "English", "Mathematics" |

---

## Setup Instructions

### 1. Install Frappe Bench

```bash
# Install bench
pip install frappe-bench

# Initialise a new bench
bench init frappe-bench --frappe-branch version-15
cd frappe-bench

# Create a new site
bench new-site school.localhost --db-name school_db

# Install the Education app
bench get-app education
bench --site school.localhost install-app education

# Start the server
bench start
```

### 2. Create Your App

```bash
bench new-app assessment_exercise
bench --site school.localhost install-app assessment_exercise
```

### 3. Frontend Setup

```bash
cd apps/assessment_exercise/frontend
yarn create vite . --template react-ts
yarn install
yarn add frappe-react-sdk
yarn dev
```

Add a proxy in `vite.config.ts` to route API calls to Frappe:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://school.localhost:8000',
    },
  },
})
```

---

## Evaluation Criteria

| Area | What we look for |
|---|---|
| **API design** | Clean, consistent, well-structured endpoints; proper error handling |
| **Data model** | Understanding of the Frappe Education doctype hierarchy |
| **Frontend quality** | Component structure, TypeScript types, clean state management |
| **UX clarity** | Is the assessment scheme easy to read and navigate? |
| **Validation** | Does the UI enforce the marking scheme rules correctly? |
| **Code quality** | Readable, commented where non-obvious; no dead code |
| **README** | Can we run it following your instructions? |

---

## Reference: Class VI–VIII Assessment Scheme Summary

```
Academic Year
│
├── Term I
│   ├── [Main Subjects] PT-I                — 80 marks (pure theory exam)
│   ├── [Main Subjects] Internal Assessment  — 20 marks
│   │   ├── PT Internal                      —  5 marks (PT-I scaled 80 → 5)
│   │   ├── Multiple Assessment (MA)         —  5 marks
│   │   ├── Subject Enrichment (SEA)         —  5 marks
│   │   └── Portfolio                        —  5 marks
│   └── [Main Subjects] Half Yearly          — 80 marks (term result exam)
│
│   ├── [Skill: Coding] PT-I (Theory)        — 50 marks (pure theory exam)
│   └── [Skill: Coding] Internal Assessment  — 50 marks
│       ├── PT Internal                      —  5 marks (PT-I scaled 50 → 5)
│       ├── Multiple Assessment (MA)         —  5 marks
│       ├── Subject Enrichment (SEA)         —  5 marks
│       ├── Portfolio                        —  5 marks
│       └── Practical                        — 30 marks
│
│   └── [Co-scholastic] Internal Assessment  —  5 marks (continuous, A–E scale)
│
└── Term II
    ├── [Main Subjects] PT-II               — 80 marks (pure theory exam)
    ├── [Main Subjects] Internal Assessment  — 20 marks
    │   ├── PT Internal                      —  5 marks (PT-II scaled 80 → 5)
    │   ├── Multiple Assessment (MA)         —  5 marks
    │   ├── Subject Enrichment (SEA)         —  5 marks
    │   └── Portfolio                        —  5 marks
    └── [Main Subjects] Yearly              — 80 marks (term result exam)

        ├── [Skill: Coding] PT-II (Theory)   — 50 marks (pure theory exam)
        └── [Skill: Coding] Internal         — 50 marks (same breakdown as Term I)

        └── [Co-scholastic] Internal         —  5 marks (continuous, A–E scale)

Subjects per Class (VI, VII, VIII):
  Language (choose 1 — plans created for all 3):
                        Hindi (085) | Mizo (108) | Manipuri (112)
  Core (all 4):         English (184) | Mathematics (041)
                        Science (086) | Social Science (087)
  Skill (1):            Coding
  Co-scholastic (3):    Art Education | Life Skills | HPE & Work Experience

Marks per Subject Type:
  Main Subject:   PT(80) + Internal(20) + Half Yearly or Yearly(80) per term
                  End-of-session result: 80 (theory avg) + 20 (internal avg) = 100
  Skill Subject:  PT Theory(50) + Internal(50) per term
                  End-of-session result: 50 (theory avg) + 50 (internal avg) = 100
  Co-scholastic:  5-point scale (A–E), (5 + 5) ÷ 2 = 5 end-of-session

Pass Criteria:
  Main & Skill:   33% in theory component AND 33% in internal component (independently)
  Co-scholastic:  Grade B or above (no numeric fail)
```

---

## Submission Checklist

- [ ] GitHub repository (public or private with access granted)
- [ ] `README.md` with setup and run instructions
- [ ] Backend API endpoints working (tested via Postman or curl examples in README)
- [ ] React frontend displaying the assessment scheme
- [ ] Create/edit assessment plan flow functional
- [ ] Validation rules enforced on the frontend
- [ ] Code is linted (`ruff check` for Python, `yarn lint` for TypeScript)

---

## Questions?

If anything is unclear about the domain, please ask before investing time in assumptions. We are happy to clarify the CBSE marking structure or Frappe setup.

Good luck!
