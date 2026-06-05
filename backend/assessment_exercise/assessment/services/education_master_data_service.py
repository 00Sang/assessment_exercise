"""Read Education master data for assessment plan forms."""

from __future__ import annotations

import frappe

from ..constants import COURSE_SLUG_TO_NAME, COURSE_SUBJECT_TYPE, TERM_LABEL_TO_ID

FRONTEND_SUBJECT_TYPE_BY_SCHEME: dict[str, str] = {
	"CORE": "main",
	"LANGUAGE": "main",
	"SKILL": "skill",
	"CO_SCHOLASTIC": "co-scholastic",
}

COURSE_NAME_TO_SLUG: dict[str, str] = {
	course_name: slug for slug, course_name in COURSE_SLUG_TO_NAME.items()
}


def get_plan_form_options() -> dict[str, list[dict]]:
	"""Return programs, courses, academic years, and terms for the plan form."""
	return {
		"programs": _get_programs(),
		"courses": _get_courses(),
		"academicYears": _get_academic_years(),
		"academicTerms": _get_academic_terms(),
	}


def _get_programs() -> list[dict]:
	rows = frappe.get_all(
		"Program",
		fields=["name", "program_name"],
		order_by="program_name asc",
	)
	return [
		{
			"name": row.name,
			"program_name": row.program_name or row.name,
		}
		for row in rows
	]


def _get_courses() -> list[dict]:
	rows = frappe.get_all(
		"Course",
		fields=["name", "course_name"],
		order_by="course_name asc",
	)
	courses: list[dict] = []
	for row in rows:
		course_name = row.course_name or row.name
		course_id = COURSE_NAME_TO_SLUG.get(course_name, row.name)
		scheme_type = COURSE_SUBJECT_TYPE.get(course_id, "CORE")
		courses.append(
			{
				"id": course_id,
				"name": row.name,
				"course_name": course_name,
				"subjectType": FRONTEND_SUBJECT_TYPE_BY_SCHEME.get(scheme_type, "main"),
				"schemeSubjectType": scheme_type,
			}
		)
	return courses


def _get_academic_years() -> list[dict]:
	rows = frappe.get_all(
		"Academic Year",
		fields=["name", "academic_year_name", "year_start_date"],
		order_by="year_start_date desc",
	)
	return [
		{
			"name": row.name,
			"academic_year_name": row.academic_year_name or row.name,
		}
		for row in rows
	]


def _get_academic_terms() -> list[dict]:
	rows = frappe.get_all(
		"Academic Term",
		fields=["name", "term_name", "academic_year", "term_start_date"],
		order_by="term_start_date asc",
	)
	terms: list[dict] = []
	for row in rows:
		term_name = row.term_name or row.name
		term_id = TERM_LABEL_TO_ID.get(term_name)
		if not term_id and term_name:
			normalized = term_name.lower().replace(" ", "")
			if normalized in ("termi", "term1"):
				term_id = "term-1"
			elif normalized in ("termii", "term2"):
				term_id = "term-2"
		terms.append(
			{
				"name": row.name,
				"term_name": term_name,
				"term_id": term_id or term_name,
				"academic_year": row.academic_year,
			}
		)
	return terms
