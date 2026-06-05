from ..constants import (
	COURSE_LABELS,
	COURSE_SLUG_TO_NAME,
	COURSE_SUBJECT_TYPE,
	CYCLE_SLUG_TO_EXAM_NAME,
	PROGRAM_SLUG_TO_NAME,
	TERM_ID_TO_LABEL,
	TERM_LABEL_TO_ID,
)
from .assessment_criteria_service import get_all_assessment_criteria
from .assessment_group_service import build_group_tree
from .assessment_plan_service import list_assessment_plans


def get_term_scheme(
	program: str | None = None,
	academic_year: str | None = None,
	term_id: str | None = None,
) -> dict:
	"""Return configured groups, criteria, and plan snapshots for scheme validation."""
	term_label = _resolve_term_label(term_id) if term_id else None
	year_label = (academic_year or "").strip() or None
	tree = build_group_tree(year_label)
	configured_groups = _extract_exam_groups_from_tree(tree, term_label)
	plans_raw = list_assessment_plans()
	plans = []
	for plan in plans_raw:
		if term_id and term_label and not _plan_matches_term(plan, term_id, term_label):
			continue
		if not _plan_matches_year(plan, year_label):
			continue
		if not _plan_matches_program(plan, program):
			continue
		course_slug = _course_name_to_slug(plan.get("course", ""))
		group_doc = plan.get("assessmentGroupDoc") or plan.get("assessmentGroup", "")
		group_label = _resolve_group_label(group_doc, plan.get("assessmentGroup", ""))
		plans.append(
			{
				"courseId": course_slug,
				"courseLabel": COURSE_LABELS.get(course_slug, plan.get("course", "")),
				"subjectType": COURSE_SUBJECT_TYPE.get(course_slug, "CORE"),
				"assessmentGroupId": group_doc,
				"assessmentGroupLabel": group_label,
				"maximumAssessmentScore": plan.get("maximumAssessmentScore"),
				"criteriaSummary": plan.get("criteriaSummary", ""),
				"criteria": plan.get("criteria") or [],
			}
		)
	return {
		"program": program or "",
		"academicYear": year_label or "",
		"termId": term_id or "",
		"termLabel": term_label or "",
		"configuredGroups": configured_groups,
		"assessmentCriteria": get_all_assessment_criteria(),
		"plans": plans,
	}


def get_assessment_scheme(program: str | None = None, academic_year: str | None = None) -> dict:
	"""Return nested assessment scheme tree for a program and year (demo-friendly)."""
	year_label = (academic_year or "").strip() or None
	term_structures = []
	for term_id, term_label in TERM_ID_TO_LABEL.items():
		term_data = get_term_scheme(program, year_label, term_id)
		cycles = _build_cycles_for_term(term_data["plans"])
		term_structures.append(
			{
				"id": term_id,
				"label": term_label,
				"cycles": cycles,
			}
		)
	return {
		"program": program or "",
		"academicYear": year_label or "",
		"terms": term_structures,
	}


def _resolve_term_label(term_id: str) -> str:
	"""Map a term id or label slug to the Assessment Group term display name."""
	if term_id in TERM_ID_TO_LABEL:
		return TERM_ID_TO_LABEL[term_id]
	mapped_id = TERM_LABEL_TO_ID.get(term_id)
	if mapped_id:
		return TERM_ID_TO_LABEL.get(mapped_id, term_id)
	return term_id


def _plan_matches_term(plan: dict, term_id: str, term_label: str) -> bool:
	"""Return True when a plan belongs to the requested term id or label."""
	academic_term_value = (plan.get("academicTerm") or "").strip()
	if not academic_term_value:
		return False
	if academic_term_value in (term_label, term_id):
		return True
	plan_term_label = _resolve_stored_academic_term_label(academic_term_value)
	if plan_term_label == term_label:
		return True
	plan_term_id = TERM_LABEL_TO_ID.get(plan_term_label)
	return plan_term_id == term_id


def _resolve_stored_academic_term_label(value: str) -> str:
	"""Resolve an Academic Term document name or label to a canonical term label."""
	import frappe

	if frappe.db.exists("Academic Term", value):
		term_name = frappe.db.get_value("Academic Term", value, "term_name")
		if term_name:
			return _normalize_term_name(str(term_name))
	if "(" in value and value.endswith(")"):
		inner = value[value.rindex("(") + 1 : -1].strip()
		if inner:
			return _normalize_term_name(inner)
	return _normalize_term_name(value)


def _normalize_term_name(term_name: str) -> str:
	"""Normalize Term 1 / Term I variants to canonical term labels."""
	mapped_id = TERM_LABEL_TO_ID.get(term_name)
	if mapped_id:
		return TERM_ID_TO_LABEL[mapped_id]
	normalized = term_name.lower().replace(" ", "")
	if normalized in ("termi", "term1"):
		return TERM_ID_TO_LABEL["term-1"]
	if normalized in ("termii", "term2"):
		return TERM_ID_TO_LABEL["term-2"]
	return term_name


def _plan_matches_year(plan: dict, year_label: str | None) -> bool:
	"""Return True when a plan belongs to the requested academic year label."""
	if not year_label:
		return True
	plan_year = (plan.get("academicYear") or "").strip()
	if plan_year == year_label:
		return True
	import frappe

	if frappe.db.exists("Academic Year", plan_year):
		year_name = frappe.db.get_value("Academic Year", plan_year, "academic_year_name")
		return year_name == year_label
	return False


def _plan_matches_program(plan: dict, program: str | None) -> bool:
	"""Return True when a plan belongs to the requested program slug."""
	if not program or not str(program).strip():
		return True
	plan_program = plan.get("program", "")
	program_label = PROGRAM_SLUG_TO_NAME.get(program, program)
	return plan_program in (program_label, program)


def _extract_exam_groups_from_tree(tree: list[dict], term_label: str | None = None) -> list[dict]:
	"""Extract exam-type leaf groups from the Assessment Group tree (all terms when term_label is None)."""
	groups: list[dict] = []
	seen_ids: set[str] = set()
	for year_node in tree:
		for term_node in year_node.get("children", []):
			if term_label and term_node.get("assessment_group_name") != term_label:
				continue
			for leaf in term_node.get("children", []):
				if leaf.get("is_group"):
					continue
				leaf_id = str(leaf.get("name") or "")
				if not leaf_id or leaf_id in seen_ids:
					continue
				seen_ids.add(leaf_id)
				label = str(leaf.get("assessment_group_name") or leaf.get("name") or "")
				groups.append(
					{
						"id": leaf_id,
						"label": label,
					}
				)
	return groups


def _resolve_group_label(group_doc: str, cycle_slug: str) -> str:
	"""Resolve a display label for an assessment group document or slug."""
	import frappe

	if group_doc and frappe.db.exists("Assessment Group", group_doc):
		label = frappe.db.get_value("Assessment Group", group_doc, "assessment_group_name")
		if label:
			return label
	slug_label = CYCLE_SLUG_TO_EXAM_NAME.get(cycle_slug)
	if slug_label:
		return slug_label
	return group_doc or cycle_slug


def _course_name_to_slug(course_name: str) -> str:
	"""Map a Course document name back to a frontend slug."""
	for slug, name in COURSE_SLUG_TO_NAME.items():
		if name == course_name:
			return slug
	return course_name.lower().replace(" ", "-")


def _build_cycles_for_term(plans: list[dict]) -> list[dict]:
	"""Build cycle nodes grouped by assessment group for scheme view."""
	cycle_map: dict[str, dict] = {}
	for plan in plans:
		cycle_id = plan.get("assessmentGroupId", "")
		if cycle_id not in cycle_map:
			cycle_map[cycle_id] = {
				"id": cycle_id,
				"label": plan.get("assessmentGroupLabel", cycle_id),
				"subjects": [],
			}
		criteria_nodes = _normalize_plan_criteria(plan)
		cycle_map[cycle_id]["subjects"].append(
			{
				"course": plan.get("courseId", ""),
				"category": _subject_type_to_category(plan.get("subjectType", "CORE")),
				"criteria": criteria_nodes,
			}
		)
	return list(cycle_map.values())


def _subject_type_to_category(subject_type: str) -> str:
	"""Map subject type to frontend category string."""
	if subject_type == "SKILL":
		return "skill"
	if subject_type == "CO_SCHOLASTIC":
		return "co-scholastic"
	return "main"


def _normalize_plan_criteria(plan: dict) -> list[dict]:
	"""Normalize plan criteria rows for scheme tree display."""
	raw_criteria = plan.get("criteria") or []
	if raw_criteria:
		return [
			{
				"name": row.get("assessmentCriteria", ""),
				"maxMarks": row.get("maxMarks") or 0,
			}
			for row in raw_criteria
			if row.get("assessmentCriteria")
		]
	return _parse_criteria_summary(plan.get("criteriaSummary", ""))


def _parse_criteria_summary(summary: str) -> list[dict]:
	"""Parse criteria summary string into structured nodes."""
	if not summary:
		return []
	parts = summary.split(" + ")
	result = []
	for part in parts:
		name = part
		max_marks = 0
		if "(" in part and part.endswith(")"):
			name = part[: part.rindex("(")].strip()
			marks_str = part[part.rindex("(") + 1 : -1]
			try:
				max_marks = float(marks_str)
			except ValueError:
				max_marks = 0
		result.append({"name": name, "maxMarks": max_marks})
	return result
