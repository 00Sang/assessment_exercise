"""Resolve frontend slugs to Frappe DocType names."""

import frappe

from ..constants import (
	COURSE_SLUG_TO_NAME,
	CYCLE_SLUG_TO_EXAM_NAME,
	EXAM_NAME_TO_CYCLE_SLUG,
	GRADING_SCALE_LEGACY_ALIASES,
	PROGRAM_SLUG_TO_NAME,
	STUDENT_GROUP_SLUG_TO_NAME,
	TERM_ID_TO_LABEL,
)


def resolve_program(value: str) -> str:
	"""Resolve a program slug or class label to a Program document name."""
	name = PROGRAM_SLUG_TO_NAME.get(value, value)
	if frappe.db.exists("Program", name):
		return name
	if frappe.db.exists("Program", value):
		return value
	if name in PROGRAM_SLUG_TO_NAME.values():
		return name
	raise frappe.ValidationError(f"Program '{value}' not found. Seed master data first.")


def resolve_course(slug: str) -> str:
	"""Resolve a course slug to a Course document name."""
	name = COURSE_SLUG_TO_NAME.get(slug, slug)
	if not frappe.db.exists("Course", name):
		raise frappe.ValidationError(f"Course '{name}' not found. Seed master data first.")
	return name


def resolve_student_group(value: str) -> str:
	"""Resolve a class slug or label to a Student Group document name."""
	name = STUDENT_GROUP_SLUG_TO_NAME.get(value, value)
	if frappe.db.exists("Student Group", name):
		return name
	if frappe.db.exists("Student Group", value):
		return value
	program_name = PROGRAM_SLUG_TO_NAME.get(value, value)
	program_groups = frappe.get_all(
		"Student Group",
		filters={"program": program_name},
		pluck="name",
		limit=1,
	)
	if program_groups:
		return program_groups[0]
	raise frappe.ValidationError(f"Student Group '{value}' not found. Seed master data first.")


def resolve_academic_year(value: str) -> str:
	"""Resolve an academic year label to an Academic Year document name."""
	raw = (value or "").strip()
	if not raw:
		raise frappe.ValidationError("Academic Year is required.")
	if frappe.db.exists("Academic Year", raw):
		return raw
	existing_names = frappe.get_all(
		"Academic Year",
		filters={"academic_year_name": raw},
		pluck="name",
		limit=1,
	)
	if existing_names:
		return existing_names[0]
	raise frappe.ValidationError(
		f"Academic Year '{raw}' not found. Run master data seed first."
	)


def _academic_term_name_variants(label: str) -> list[str]:
	"""Return equivalent term_name values (e.g. Term I vs Term 1)."""
	raw = (label or "").strip()
	if not raw:
		return []
	normalized = raw.lower().replace(" ", "")
	variants = [raw]
	if normalized in ("termi", "term1", "term i"):
		variants.extend(["Term I", "Term 1"])
	elif normalized in ("termii", "term2", "term ii"):
		variants.extend(["Term II", "Term 2"])
	unique: list[str] = []
	for variant in variants:
		if variant not in unique:
			unique.append(variant)
	return unique


def resolve_academic_term(value: str, academic_year: str | None = None) -> str:
	"""Resolve a term label to an Academic Term document name for the given year."""
	raw = (value or "").strip()
	if not raw:
		raise frappe.ValidationError("Academic Term is required.")
	year_name = resolve_academic_year(academic_year) if academic_year else None
	if frappe.db.exists("Academic Term", raw):
		if year_name:
			term_year = frappe.db.get_value("Academic Term", raw, "academic_year")
			if term_year and term_year != year_name:
				raise frappe.ValidationError(
					f"Academic Term '{raw}' belongs to '{term_year}', not '{year_name}'."
				)
		return raw
	if year_name:
		term_title = f"{year_name} ({raw})"
		if frappe.db.exists("Academic Term", term_title):
			return term_title
	term_names = _academic_term_name_variants(raw)
	filters: dict = {"term_name": ["in", term_names]}
	if year_name:
		filters["academic_year"] = year_name
	existing_names = frappe.get_all(
		"Academic Term",
		filters=filters,
		pluck="name",
		limit=1,
		order_by="term_start_date asc",
	)
	if existing_names:
		return existing_names[0]
	if year_name:
		raise frappe.ValidationError(
			f"Academic Term '{raw}' not found for year '{year_name}'. Run master data seed first."
		)
	raise frappe.ValidationError(f"Academic Term '{raw}' not found. Run master data seed first.")


def resolve_grading_scale(value: str) -> str:
	"""Resolve a grading scale label to a document name."""
	scale_name = GRADING_SCALE_LEGACY_ALIASES.get(value, value)
	if frappe.db.exists("Grading Scale", scale_name):
		return scale_name
	raise frappe.ValidationError(f"Grading Scale '{value}' not found. Seed master data first.")


def resolve_assessment_group_for_cycle(
	academic_year: str,
	term_label: str,
	cycle_slug: str,
) -> str:
	"""Resolve a cycle slug to an Assessment Group leaf document name."""
	exam_name = CYCLE_SLUG_TO_EXAM_NAME.get(cycle_slug, cycle_slug)
	if frappe.db.exists("Assessment Group", exam_name):
		return exam_name
	if not frappe.db.exists("Assessment Group", academic_year):
		raise frappe.ValidationError(
			f"Assessment Group tree for academic year '{academic_year}' not found."
		)
	term_nodes = frappe.get_all(
		"Assessment Group",
		filters={"parent_assessment_group": academic_year, "assessment_group_name": term_label},
		pluck="name",
	)
	if not term_nodes:
		raise frappe.ValidationError(
			f"Assessment Group term '{term_label}' not found under '{academic_year}'."
		)
	leaf_nodes = frappe.get_all(
		"Assessment Group",
		filters={
			"parent_assessment_group": term_nodes[0],
			"assessment_group_name": exam_name,
		},
		pluck="name",
	)
	if not leaf_nodes:
		raise frappe.ValidationError(
			f"Assessment Group '{exam_name}' not found under '{academic_year}/{term_label}'."
		)
	return leaf_nodes[0]


def resolve_cycle_slug_from_group_name(group_name: str) -> str | None:
	"""Map an Assessment Group name back to a frontend cycle slug."""
	group_label = frappe.db.get_value("Assessment Group", group_name, "assessment_group_name")
	if group_label:
		return EXAM_NAME_TO_CYCLE_SLUG.get(group_label)
	return EXAM_NAME_TO_CYCLE_SLUG.get(group_name)


def resolve_term_label(term_id: str) -> str:
	"""Resolve a term id slug to its display label."""
	return TERM_ID_TO_LABEL.get(term_id, term_id)
