"""Read grading scales from Frappe Education."""

import frappe


def get_all_grading_scales() -> list[dict]:
	"""Return grading scales for the assessment plan UI (submitted scales first)."""
	return frappe.get_all(
		"Grading Scale",
		fields=["name", "grading_scale_name", "description", "docstatus"],
		order_by="grading_scale_name asc",
	)
