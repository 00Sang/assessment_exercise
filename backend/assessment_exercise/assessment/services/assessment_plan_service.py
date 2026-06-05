import json

import frappe

from ..utils.slug_resolver import (
	resolve_academic_term,
	resolve_academic_year,
	resolve_assessment_group_for_cycle,
	resolve_course,
	resolve_grading_scale,
	resolve_program,
	resolve_student_group,
	resolve_cycle_slug_from_group_name,
)
from ..validation.plan_validation import validate_assessment_plan_payload


def save_assessment_plan(payload: dict) -> dict:
	"""Create or update an Assessment Plan from a frontend payload."""
	if isinstance(payload, str):
		payload = json.loads(payload)
	validate_assessment_plan_payload(payload)
	student_group = resolve_student_group(payload["studentGroup"])
	course = resolve_course(payload["course"])
	program = resolve_program(payload["program"])
	academic_year = resolve_academic_year(payload["academicYear"])
	academic_term = resolve_academic_term(payload["academicTerm"], academic_year)
	grading_scale = resolve_grading_scale(payload["gradingScale"])
	assessment_group = resolve_assessment_group_for_cycle(
		academic_year,
		payload["academicTerm"],
		payload["assessmentGroup"],
	)
	existing_name = _find_existing_plan_name(
		student_group,
		course,
		assessment_group,
		academic_year,
		academic_term,
	)
	schedule = payload.get("schedule") or {}
	criteria_rows = [
		{
			"assessment_criteria": row["assessmentCriteria"],
			"maximum_score": row["maxMarks"],
		}
		for row in (payload.get("criteria") or [])
		if row.get("assessmentCriteria")
	]
	try:
		if existing_name:
			doc = frappe.get_doc("Assessment Plan", existing_name)
			doc.assessment_name = payload.get("assessmentName")
			doc.maximum_assessment_score = payload.get("maximumAssessmentScore")
			doc.schedule_date = schedule.get("date")
			doc.from_time = schedule.get("fromTime")
			doc.to_time = schedule.get("toTime")
			doc.assessment_criteria = []
			for row in criteria_rows:
				doc.append("assessment_criteria", row)
			doc = _persist_and_submit_plan(doc, is_insert=False)
		else:
			doc = frappe.get_doc(
				{
					"doctype": "Assessment Plan",
					"assessment_name": payload.get("assessmentName"),
					"student_group": student_group,
					"course": course,
					"program": program,
					"assessment_group": assessment_group,
					"grading_scale": grading_scale,
					"academic_year": academic_year,
					"academic_term": academic_term,
					"schedule_date": schedule.get("date"),
					"from_time": schedule.get("fromTime"),
					"to_time": schedule.get("toTime"),
					"maximum_assessment_score": payload.get("maximumAssessmentScore"),
					"assessment_criteria": criteria_rows,
				}
			)
			doc = _persist_and_submit_plan(doc, is_insert=True)
		frappe.db.commit()
		return _serialize_plan(doc.name)
	except Exception:
		frappe.db.rollback()
		raise


def get_assessment_plan_detail(
	student_group: str | None = None,
	course: str | None = None,
	assessment_group: str | None = None,
	academic_year: str | None = None,
	academic_term: str | None = None,
	name: str | None = None,
) -> dict | None:
	"""Return a single Assessment Plan by name or composite key."""
	if name:
		if not frappe.db.exists("Assessment Plan", name):
			return None
		return _serialize_plan(name)
	if not all([student_group, course, assessment_group, academic_year, academic_term]):
		return None
	resolved_group = assessment_group
	if assessment_group and not frappe.db.exists("Assessment Group", assessment_group):
		resolved_group = resolve_assessment_group_for_cycle(
			academic_year,
			academic_term,
			assessment_group,
		)
	plan_name = _find_existing_plan_name(
		resolve_student_group(student_group),
		resolve_course(course),
		resolved_group,
		resolve_academic_year(academic_year),
		resolve_academic_term(academic_term, academic_year),
	)
	if not plan_name:
		return None
	return _serialize_plan(plan_name)


def list_assessment_plans(
	program: str | None = None,
	academic_year: str | None = None,
	academic_term: str | None = None,
	assessment_group: str | None = None,
) -> list[dict]:
	"""Return Assessment Plans; omit filters to return all plans (demo-friendly)."""
	filters: dict = {}
	if program and str(program).strip():
		filters["program"] = resolve_program(program)
	if academic_year and str(academic_year).strip():
		if frappe.db.exists("Academic Year", academic_year):
			filters["academic_year"] = academic_year
	if academic_term and str(academic_term).strip():
		if frappe.db.exists("Academic Term", academic_term):
			filters["academic_term"] = academic_term
	if assessment_group:
		if frappe.db.exists("Assessment Group", assessment_group):
			filters["assessment_group"] = assessment_group
		elif academic_year and academic_term:
			filters["assessment_group"] = resolve_assessment_group_for_cycle(
				academic_year,
				academic_term,
				assessment_group,
			)
	plans = frappe.get_all(
		"Assessment Plan",
		filters=filters,
		fields=["name"],
		order_by="modified desc",
	)
	return [_serialize_plan(plan.name) for plan in plans]


def _find_existing_plan_name(
	student_group: str,
	course: str,
	assessment_group: str,
	academic_year: str,
	academic_term: str,
) -> str | None:
	"""Find the latest active plan by composite key, falling back to cancelled."""
	matches = frappe.get_all(
		"Assessment Plan",
		filters={
			"student_group": student_group,
			"course": course,
			"assessment_group": assessment_group,
			"academic_year": academic_year,
			"academic_term": academic_term,
		},
		fields=["name", "docstatus"],
		order_by="modified desc",
	)
	for plan in matches:
		if plan.docstatus != 2:
			return plan.name
	return matches[0].name if matches else None


def _serialize_plan(plan_name: str) -> dict:
	"""Serialize an Assessment Plan document for API response."""
	doc = frappe.get_doc("Assessment Plan", plan_name)
	cycle_slug = resolve_cycle_slug_from_group_name(doc.assessment_group) or doc.assessment_group
	criteria = [
		{
			"assessmentCriteria": row.assessment_criteria,
			"maxMarks": row.maximum_score,
		}
		for row in doc.assessment_criteria
	]
	year_label = (
		frappe.db.get_value("Academic Year", doc.academic_year, "academic_year_name")
		if doc.academic_year
		else None
	) or doc.academic_year
	term_label = (
		frappe.db.get_value("Academic Term", doc.academic_term, "term_name")
		if doc.academic_term
		else None
	) or doc.academic_term
	return {
		"name": doc.name,
		"docstatus": doc.docstatus,
		"status": _resolve_plan_status(doc.docstatus),
		"assessmentName": doc.assessment_name,
		"studentGroup": doc.student_group,
		"course": doc.course,
		"program": doc.program,
		"assessmentGroup": cycle_slug,
		"assessmentGroupDoc": doc.assessment_group,
		"gradingScale": doc.grading_scale,
		"academicYear": year_label,
		"academicTerm": term_label,
		"schedule": {
			"date": str(doc.schedule_date) if doc.schedule_date else "",
			"fromTime": str(doc.from_time) if doc.from_time else "",
			"toTime": str(doc.to_time) if doc.to_time else "",
		},
		"maximumAssessmentScore": doc.maximum_assessment_score,
		"criteria": criteria,
		"criteriaSummary": _build_criteria_summary(criteria),
	}


def _persist_and_submit_plan(doc, *, is_insert: bool):
	"""Save an Assessment Plan and submit it so it is active in Education workflows."""
	if is_insert:
		doc.insert()
		if doc.docstatus == 0:
			doc.submit()
		return doc
	if doc.docstatus == 1:
		doc.cancel()
	if doc.docstatus == 2:
		cancelled_name = doc.name
		doc = frappe.copy_doc(doc)
		doc.docstatus = 0
		doc.amended_from = cancelled_name
		doc.insert()
	else:
		doc.save()
	if doc.docstatus == 0:
		doc.submit()
	return doc


def _resolve_plan_status(docstatus: int) -> str:
	"""Map Frappe docstatus to a display label."""
	if docstatus == 1:
		return "Submitted"
	if docstatus == 2:
		return "Cancelled"
	return "Draft"


def _build_criteria_summary(criteria: list[dict]) -> str:
	"""Build a human-readable criteria summary string."""
	parts = [
		f"{row['assessmentCriteria']} ({row['maxMarks']})"
		for row in criteria
		if row.get("assessmentCriteria")
	]
	return " + ".join(parts) if parts else ""
