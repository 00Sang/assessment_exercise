"""Server-side CBSE assessment plan validation rules."""

import frappe

from ..constants import COURSE_SLUG_TO_NAME, COURSE_SUBJECT_TYPE
from ..utils.slug_resolver import resolve_assessment_group_for_cycle


def validate_assessment_plan_payload(payload: dict) -> None:
	"""Validate an assessment plan payload before save."""
	course_slug = payload.get("course", "")
	subject_type = _resolve_subject_type(course_slug, payload)
	cycle_slug = payload.get("assessmentGroup", "")
	criteria = payload.get("criteria") or []
	max_score = payload.get("maximumAssessmentScore")
	if max_score is None:
		raise frappe.ValidationError("Maximum Assessment Score is required.")
	criteria_total = sum(
		row.get("maxMarks") or 0 for row in criteria if row.get("assessmentCriteria")
	)
	is_internal, is_pt, is_main_exam = _classify_assessment_cycle(payload, cycle_slug)
	if subject_type in ("CORE", "LANGUAGE"):
		if is_pt and max_score > 80:
			raise frappe.ValidationError("PT must not exceed 80 marks for main subjects.")
		if is_internal and criteria_total != 20:
			raise frappe.ValidationError(
				f"Main subject internal criteria must sum to exactly 20 (current: {criteria_total})."
			)
	elif subject_type == "SKILL":
		if is_pt and max_score > 50:
			raise frappe.ValidationError("PT must not exceed 50 marks for skill subjects.")
		if is_internal and criteria_total != 50:
			raise frappe.ValidationError(
				f"Skill subject internal criteria must sum to exactly 50 (current: {criteria_total})."
			)
	elif subject_type == "CO_SCHOLASTIC":
		if is_pt or is_main_exam:
			raise frappe.ValidationError("Co-scholastic subjects must not have theory/main exam groups.")
		if max_score > 5:
			raise frappe.ValidationError("Co-scholastic subjects must use the 5-point scale only.")
	for row in criteria:
		if not row.get("assessmentCriteria") or row.get("maxMarks") is None:
			raise frappe.ValidationError("Each criteria row must have Assessment Criteria and Maximum Score.")


def _classify_assessment_cycle(payload: dict, cycle_slug: str) -> tuple[bool, bool, bool]:
	"""Return whether the cycle is internal, PT, or a main exam (half-yearly/yearly)."""
	label = cycle_slug
	academic_year = payload.get("academicYear")
	academic_term = payload.get("academicTerm")
	if academic_year and academic_term and cycle_slug:
		try:
			group_name = resolve_assessment_group_for_cycle(
				academic_year,
				academic_term,
				cycle_slug,
			)
			resolved_label = frappe.db.get_value(
				"Assessment Group",
				group_name,
				"assessment_group_name",
			)
			if resolved_label:
				label = resolved_label
		except Exception:
			pass
	label_lower = label.lower()
	is_internal = "internal" in label_lower or "school-based" in label_lower
	is_pt = label_lower.startswith("pt") or " pt" in label_lower.replace("-", " ")
	is_main_exam = "half" in label_lower or "yearly" in label_lower
	if not is_internal and not is_pt and not is_main_exam:
		is_internal = cycle_slug.startswith("internal")
		is_pt = cycle_slug.startswith("pt-")
		is_main_exam = cycle_slug in ("half-yearly", "yearly")
	return is_internal, is_pt, is_main_exam


def _resolve_subject_type(course_slug: str, payload: dict) -> str:
	"""Resolve subject type from course slug, course name, or payload hint."""
	if course_slug in COURSE_SUBJECT_TYPE:
		return COURSE_SUBJECT_TYPE[course_slug]
	for slug, course_name in COURSE_SLUG_TO_NAME.items():
		if course_name == course_slug:
			return COURSE_SUBJECT_TYPE[slug]
	course_category = payload.get("courseCategory")
	if course_category == "main":
		return "CORE"
	if course_category == "skill":
		return "SKILL"
	if course_category == "co-scholastic":
		return "CO_SCHOLASTIC"
	return "CORE"
