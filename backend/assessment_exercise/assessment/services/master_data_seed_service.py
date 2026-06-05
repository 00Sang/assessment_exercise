"""Idempotent seed for Frappe Education master data used by assessment plans."""

from __future__ import annotations

from datetime import date
from typing import Any

import frappe

from ..constants import (
	COURSE_SLUG_TO_NAME,
	GRADING_SCALE_CO_SCHOLASTIC,
	GRADING_SCALE_MAIN,
	GRADING_SCALE_SKILL,
	PROGRAM_SLUG_TO_NAME,
	STUDENT_GROUP_SLUG_TO_NAME,
)

DEFAULT_ACADEMIC_YEAR = "2025-26"
TERM_DEFINITIONS: tuple[tuple[str, date, date], ...] = (
	("Term I", date(2025, 4, 1), date(2025, 9, 30)),
	("Term II", date(2025, 10, 1), date(2026, 3, 31)),
)
SCHOLASTIC_INTERVALS: tuple[dict[str, str | float], ...] = (
	{"grade_code": "A", "threshold": 100, "grade_description": "Outstanding"},
	{"grade_code": "B", "threshold": 80, "grade_description": "Very Good"},
	{"grade_code": "C", "threshold": 70, "grade_description": "Good"},
	{"grade_code": "D", "threshold": 60, "grade_description": "Satisfactory"},
	{"grade_code": "E", "threshold": 50, "grade_description": "Needs Improvement"},
	{"grade_code": "F", "threshold": 0, "grade_description": "Fail"},
)
CO_SCHOLASTIC_INTERVALS: tuple[dict[str, str | float], ...] = (
	{"grade_code": "A", "threshold": 100, "grade_description": "Outstanding"},
	{"grade_code": "B", "threshold": 80, "grade_description": "Very Good"},
	{"grade_code": "C", "threshold": 60, "grade_description": "Good"},
	{"grade_code": "D", "threshold": 40, "grade_description": "Satisfactory"},
	{"grade_code": "E", "threshold": 20, "grade_description": "Needs Improvement"},
	{"grade_code": "F", "threshold": 0, "grade_description": "Fail"},
)
GRADING_SCALE_DEFINITIONS: dict[str, tuple[dict[str, str | float], ...]] = {
	GRADING_SCALE_MAIN: SCHOLASTIC_INTERVALS,
	GRADING_SCALE_SKILL: SCHOLASTIC_INTERVALS,
	GRADING_SCALE_CO_SCHOLASTIC: CO_SCHOLASTIC_INTERVALS,
}


def seed_master_data(academic_year: str = DEFAULT_ACADEMIC_YEAR) -> dict[str, Any]:
	"""
	Create Programs, Courses, Academic Year/Terms, and Student Groups (one per class).

	Safe to run multiple times; existing records are skipped.
	"""
	frappe.only_for(("System Manager", "Administrator"))
	summary: dict[str, list[str]] = {
		"created": [],
		"skipped": [],
		"warnings": [],
	}
	_ensure_programs(summary)
	_ensure_courses(summary)
	_ensure_academic_year(academic_year, summary)
	_ensure_academic_terms(academic_year, summary)
	_ensure_student_groups(academic_year, summary)
	_ensure_grading_scales(summary)
	return {
		"academicYear": academic_year,
		"createdCount": len(summary["created"]),
		"skippedCount": len(summary["skipped"]),
		"warningCount": len(summary["warnings"]),
		"created": summary["created"],
		"skipped": summary["skipped"],
		"warnings": summary["warnings"],
	}


def _ensure_programs(summary: dict[str, list[str]]) -> None:
	program_names = sorted(set(PROGRAM_SLUG_TO_NAME.values()))
	for program_name in program_names:
		_upsert_document(
			summary=summary,
			doctype="Program",
			name=program_name,
			values={
				"program_name": program_name,
				"program_abbreviation": program_name.replace("Class ", ""),
			},
		)


def _ensure_courses(summary: dict[str, list[str]]) -> None:
	course_names = sorted(set(COURSE_SLUG_TO_NAME.values()))
	for course_name in course_names:
		_upsert_document(
			summary=summary,
			doctype="Course",
			name=course_name,
			values={"course_name": course_name},
		)


def _ensure_academic_year(academic_year: str, summary: dict[str, list[str]]) -> None:
	_upsert_document(
		summary=summary,
		doctype="Academic Year",
		name=academic_year,
		values={
			"academic_year_name": academic_year,
			"year_start_date": date(2025, 4, 1),
			"year_end_date": date(2026, 3, 31),
		},
	)


def _ensure_academic_terms(academic_year: str, summary: dict[str, list[str]]) -> None:
	for term_name, term_start_date, term_end_date in TERM_DEFINITIONS:
		term_title = f"{academic_year} ({term_name})"
		_upsert_document(
			summary=summary,
			doctype="Academic Term",
			name=term_title,
			values={
				"academic_year": academic_year,
				"term_name": term_name,
				"title": term_title,
				"term_start_date": term_start_date,
				"term_end_date": term_end_date,
			},
		)


def _ensure_student_groups(academic_year: str, summary: dict[str, list[str]]) -> None:
	default_term_name = _resolve_academic_term_name(academic_year, "Term I")
	for group_name in sorted(set(STUDENT_GROUP_SLUG_TO_NAME.values())):
		_upsert_document(
			summary=summary,
			doctype="Student Group",
			name=group_name,
			values={
				"student_group_name": group_name,
				"group_based_on": "Program",
				"academic_year": academic_year,
				"academic_term": default_term_name,
				"program": group_name,
				"max_strength": 40,
			},
		)


def _resolve_academic_term_name(academic_year: str, term_name: str) -> str:
	"""Return Academic Term document name for a year + term label."""
	term_title = f"{academic_year} ({term_name})"
	if frappe.db.exists("Academic Term", term_title):
		return term_title
	existing_names = frappe.get_all(
		"Academic Term",
		filters={"academic_year": academic_year, "term_name": term_name},
		pluck="name",
		limit=1,
	)
	if existing_names:
		return existing_names[0]
	return term_title


def _ensure_grading_scales(summary: dict[str, list[str]]) -> None:
	"""Create and submit Grading 1 (main), Grading 2 (skill), Grading 3 (co-scholastic)."""
	for scale_name, intervals in GRADING_SCALE_DEFINITIONS.items():
		if frappe.db.exists("Grading Scale", scale_name):
			document = frappe.get_doc("Grading Scale", scale_name)
			if document.docstatus == 0:
				document.submit()
				frappe.db.commit()
				summary["created"].append(f"Grading Scale submitted: {scale_name}")
			else:
				summary["skipped"].append(f"Grading Scale: {scale_name}")
			continue
		document = frappe.get_doc(
			{
				"doctype": "Grading Scale",
				"grading_scale_name": scale_name,
				"description": f"CBSE demo grading scale ({scale_name})",
				"intervals": [dict(interval) for interval in intervals],
			}
		)
		document.insert(ignore_permissions=True)
		document.submit()
		frappe.db.commit()
		summary["created"].append(f"Grading Scale: {document.name}")


def _upsert_document(
	*,
	summary: dict[str, list[str]],
	doctype: str,
	name: str,
	values: dict[str, Any],
) -> None:
	if frappe.db.exists(doctype, name):
		summary["skipped"].append(f"{doctype}: {name}")
		return
	document = frappe.get_doc({"doctype": doctype, **values})
	document.insert(ignore_permissions=True)
	frappe.db.commit()
	summary["created"].append(f"{doctype}: {document.name}")
