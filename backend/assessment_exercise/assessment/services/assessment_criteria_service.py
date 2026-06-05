import frappe


def check_assessment_criteria(assessment_criteria: str) -> str | None:
	"""Return the document name if the criteria exists, else None."""
	return frappe.db.exists("Assessment Criteria", assessment_criteria)


def is_criteria_linked(criteria_name: str) -> bool:
	"""Return True if criteria is referenced by any Assessment Plan."""
	return bool(
		frappe.db.exists(
			"Assessment Plan Criteria",
			{"assessment_criteria": criteria_name},
		)
	)


def create_assessment_criteria(
	assessment_criteria: str,
	assessment_criteria_group: str | None = None,
) -> str:
	"""Create an Assessment Criteria record if it does not exist."""
	existing = check_assessment_criteria(assessment_criteria)
	if existing:
		return existing
	try:
		doc_data = {
			"doctype": "Assessment Criteria",
			"assessment_criteria": assessment_criteria,
		}
		if assessment_criteria_group:
			doc_data["assessment_criteria_group"] = assessment_criteria_group
		doc = frappe.get_doc(doc_data)
		doc.insert()
		return doc.name
	except Exception:
		frappe.db.rollback()
		raise


def get_all_assessment_criteria() -> list[dict]:
	"""Return all Assessment Criteria records."""
	return frappe.get_all(
		"Assessment Criteria",
		fields=["name", "assessment_criteria", "assessment_criteria_group"],
		order_by="assessment_criteria asc",
	)


def update_assessment_criteria(old_name: str, new_name: str) -> str:
	"""Safely replace criteria name when rename is disabled on the doctype."""
	if old_name == new_name:
		return old_name
	if not check_assessment_criteria(old_name):
		raise frappe.ValidationError(f"Assessment Criteria '{old_name}' not found.")
	if check_assessment_criteria(new_name):
		raise frappe.ValidationError(f"Assessment Criteria '{new_name}' already exists.")
	if is_criteria_linked(old_name):
		raise frappe.ValidationError(
			f"Cannot rename '{old_name}' because it is used in existing assessment plans."
		)
	try:
		old_doc = frappe.get_doc("Assessment Criteria", old_name)
		group = old_doc.get("assessment_criteria_group")
		frappe.delete_doc("Assessment Criteria", old_name, force=True)
		return create_assessment_criteria(new_name, group)
	except Exception:
		frappe.db.rollback()
		raise


def delete_assessment_criteria(criteria_name: str) -> None:
	"""Delete an Assessment Criteria record."""
	if not check_assessment_criteria(criteria_name):
		raise frappe.ValidationError(f"Assessment Criteria '{criteria_name}' not found.")
	if is_criteria_linked(criteria_name):
		raise frappe.ValidationError(
			f"Cannot delete '{criteria_name}' because it is used in existing assessment plans."
		)
	try:
		frappe.delete_doc("Assessment Criteria", criteria_name)
	except Exception:
		frappe.db.rollback()
		raise
