"""Whitelisted API methods for the Assessment module."""

import json

import frappe

from .services.assessment_criteria_service import (
	create_assessment_criteria as create_criteria_record,
	delete_assessment_criteria as delete_criteria_record,
	get_all_assessment_criteria,
	update_assessment_criteria as update_criteria_record,
)
from .services.education_master_data_service import get_plan_form_options as fetch_plan_form_options
from .services.grading_scale_service import get_all_grading_scales
from .services.assessment_group_service import (
	bulk_create_assessment_groups as bulk_create_groups,
	build_group_tree,
	create_assessment_group as create_group_record,
	delete_assessment_group as delete_group_record,
	update_assessment_group as update_group_record,
	get_all_assessment_groups,
)
from .services.assessment_plan_service import (
	get_assessment_plan_detail as fetch_plan_detail,
	list_assessment_plans as fetch_plans,
	save_assessment_plan as save_plan_record,
)
from .services.master_data_seed_service import seed_master_data as seed_education_master_data
from .services.term_scheme_service import (
	get_assessment_scheme as build_assessment_scheme,
	get_term_scheme as build_term_scheme,
)
from .utils.api_response import api_error, api_success


def _handle_api_call(handler):
	"""Execute a handler and return a standard API envelope."""
	try:
		return api_success(handler())
	except Exception as error:
		frappe.log_error(
			title="Assessment API Error",
			message=frappe.get_traceback(),
		)
		return api_error(str(error))


@frappe.whitelist()
def ping():
	"""Smoke test endpoint."""
	return api_success({"message": "pong"})


# --- Assessment Criteria ---


@frappe.whitelist()
def get_assessment_criteria():
	"""List all Assessment Criteria."""
	return _handle_api_call(get_all_assessment_criteria)


@frappe.whitelist()
def create_assessment_criteria(criteria_name: str, assessment_criteria_group: str | None = None):
	"""Create an Assessment Criteria record."""
	return _handle_api_call(
		lambda: create_criteria_record(criteria_name, assessment_criteria_group)
	)


@frappe.whitelist()
def update_assessment_criteria(old_name: str, new_name: str):
	"""Update (replace) an Assessment Criteria name."""
	return _handle_api_call(lambda: update_criteria_record(old_name, new_name))


@frappe.whitelist()
def delete_assessment_criteria(criteria_name: str):
	"""Delete an Assessment Criteria record."""
	def _delete():
		delete_criteria_record(criteria_name)
		return {"message": f"Assessment Criteria '{criteria_name}' deleted"}

	return _handle_api_call(_delete)


# --- Grading Scale ---


@frappe.whitelist()
def get_grading_scales():
	"""List grading scales for the assessment plan form."""
	return _handle_api_call(get_all_grading_scales)


@frappe.whitelist()
def get_plan_form_options():
	"""List programs, courses, academic years, and terms for the plan form."""
	return _handle_api_call(fetch_plan_form_options)


# --- Assessment Group ---


@frappe.whitelist()
def get_assessment_groups(academic_year: str | None = None):
	"""Return Assessment Group tree for an academic year."""
	return _handle_api_call(lambda: build_group_tree(academic_year))


@frappe.whitelist()
def get_assessment_groups_flat(academic_year: str | None = None):
	"""Return flat list of Assessment Groups."""
	return _handle_api_call(lambda: get_all_assessment_groups(academic_year))


@frappe.whitelist()
def create_assessment_group(
	assessment_group_name: str,
	parent_assessment_group: str,
	is_group: int = 0,
):
	"""Create a single Assessment Group node."""
	return _handle_api_call(
		lambda: create_group_record(assessment_group_name, parent_assessment_group, is_group)
	)


@frappe.whitelist()
def bulk_create_assessment_groups(rows=None):
	"""Bulk create Assessment Group hierarchy from frontend payload."""
	def _bulk_create():
		parsed_rows = rows
		if isinstance(rows, str):
			parsed_rows = json.loads(rows)
		if not parsed_rows:
			raise frappe.ValidationError("No rows provided.")
		return bulk_create_groups(parsed_rows)

	return _handle_api_call(_bulk_create)


@frappe.whitelist()
def update_assessment_group(old_name: str, new_name: str):
	"""Rename an Assessment Group exam type."""
	return _handle_api_call(lambda: update_group_record(old_name, new_name))


@frappe.whitelist()
def delete_assessment_group(assessment_group_name: str):
	"""Delete an Assessment Group leaf node."""
	def _delete():
		delete_group_record(assessment_group_name)
		return {"message": f"Assessment Group '{assessment_group_name}' deleted"}

	return _handle_api_call(_delete)


# --- Master data seed ---


@frappe.whitelist()
def seed_master_data(academic_year: str = "2025-26"):
	"""Seed Programs, Courses, Academic Year/Terms, and Student Groups (idempotent)."""
	return _handle_api_call(lambda: seed_education_master_data(academic_year))


# --- Assessment Plan ---


@frappe.whitelist()
def save_assessment_plan(payload=None):
	"""Create or update an Assessment Plan."""
	def _save():
		parsed = payload
		if isinstance(payload, str):
			parsed = json.loads(payload)
		if not parsed:
			raise frappe.ValidationError("Plan payload is required.")
		return save_plan_record(parsed)

	return _handle_api_call(_save)


@frappe.whitelist()
def get_assessment_plan_detail(
	student_group: str | None = None,
	course: str | None = None,
	assessment_group: str | None = None,
	academic_year: str | None = None,
	academic_term: str | None = None,
	name: str | None = None,
):
	"""Return a single Assessment Plan."""
	return _handle_api_call(
		lambda: fetch_plan_detail(
			student_group=student_group,
			course=course,
			assessment_group=assessment_group,
			academic_year=academic_year,
			academic_term=academic_term,
			name=name,
		)
	)


@frappe.whitelist()
def list_assessment_plans(
	program: str | None = None,
	academic_year: str | None = None,
	academic_term: str | None = None,
	assessment_group: str | None = None,
):
	"""List Assessment Plans with optional filters."""
	return _handle_api_call(
		lambda: fetch_plans(
			program=program,
			academic_year=academic_year,
			academic_term=academic_term,
			assessment_group=assessment_group,
		)
	)


# --- Term Scheme ---


@frappe.whitelist()
def get_term_scheme(program: str | None = None, academic_year: str | None = None, term_id: str | None = None):
	"""Return configured groups and plans for scheme validation (term filter optional)."""
	return _handle_api_call(lambda: build_term_scheme(program, academic_year, term_id))


@frappe.whitelist()
def get_assessment_scheme(program: str | None = None, academic_year: str | None = None):
	"""Return nested assessment scheme tree (filters are optional for demo)."""
	return _handle_api_call(lambda: build_assessment_scheme(program, academic_year))
