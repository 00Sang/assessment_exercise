import frappe

from ..constants import ROOT_ASSESSMENT_GROUP


def check_assessment_group(assessment_group_name: str) -> str | None:
	"""Return Assessment Group docname if it exists."""
	return frappe.db.exists("Assessment Group", assessment_group_name)


def ensure_root_assessment_group() -> str:
	"""Ensure the root Assessment Group node exists."""
	if check_assessment_group(ROOT_ASSESSMENT_GROUP):
		return ROOT_ASSESSMENT_GROUP
	try:
		doc = frappe.get_doc(
			{
				"doctype": "Assessment Group",
				"assessment_group_name": ROOT_ASSESSMENT_GROUP,
				"is_group": 1,
			}
		)
		doc.insert(ignore_mandatory=True)
		return doc.name
	except Exception:
		frappe.db.rollback()
		raise


def create_assessment_group(
	assessment_group_name: str,
	parent_assessment_group: str,
	is_group: int = 0,
) -> str:
	"""Create an Assessment Group node if it does not exist."""
	existing = check_assessment_group(assessment_group_name)
	if existing:
		return existing
	try:
		doc = frappe.get_doc(
			{
				"doctype": "Assessment Group",
				"assessment_group_name": assessment_group_name,
				"parent_assessment_group": parent_assessment_group,
				"is_group": is_group,
			}
		)
		doc.insert()
		return doc.name
	except Exception:
		frappe.db.rollback()
		raise


def get_all_assessment_groups(academic_year: str | None = None) -> list[dict]:
	"""Return flat list of Assessment Group nodes, optionally filtered by year."""
	filters = {}
	if academic_year:
		year_exists = check_assessment_group(academic_year)
		if not year_exists:
			return []
		filters["parent_assessment_group"] = ["in", _get_descendant_names(academic_year)]
	return frappe.get_all(
		"Assessment Group",
		filters=filters,
		fields=[
			"name",
			"assessment_group_name",
			"parent_assessment_group",
			"is_group",
		],
		order_by="lft asc",
	)


def resolve_year_group_root(academic_year_label: str | None) -> str | None:
	"""Resolve an academic year label to an Assessment Group year node name."""
	if not academic_year_label or not str(academic_year_label).strip():
		return None
	year_label = str(academic_year_label).strip()
	if check_assessment_group(year_label):
		return year_label
	matches = frappe.get_all(
		"Assessment Group",
		filters={"assessment_group_name": year_label},
		fields=["name"],
		limit=1,
	)
	if matches:
		return matches[0]["name"]
	return None


def build_group_tree(academic_year: str | None = None) -> list[dict]:
	"""Return nested Assessment Group tree for UI display."""
	ensure_root_assessment_group()
	root_name = ROOT_ASSESSMENT_GROUP
	if academic_year:
		year_root = resolve_year_group_root(academic_year)
		if not year_root:
			return []
		return _build_subtree(year_root)
	all_nodes = frappe.get_all(
		"Assessment Group",
		fields=["name", "assessment_group_name", "parent_assessment_group", "is_group"],
		order_by="lft asc",
	)
	return _build_tree_from_nodes(all_nodes, root_name)


def bulk_create_assessment_groups(rows: list[dict]) -> list[str]:
	"""Bulk create Assessment Group hierarchy from frontend payload rows."""
	ensure_root_assessment_group()
	created: list[str] = []
	for row in rows:
		academic_year = row.get("academicYear") or row.get("academic_year")
		term = row.get("term")
		exam_name = row.get("examName") or row.get("exam_name")
		if not academic_year or not term or not exam_name:
			continue
		year_name = create_assessment_group(academic_year, ROOT_ASSESSMENT_GROUP, is_group=1)
		term_name = create_assessment_group(term, year_name, is_group=1)
		leaf_name = create_assessment_group(exam_name, term_name, is_group=0)
		created.append(leaf_name)
	return created


def is_assessment_group_linked(group_name: str) -> bool:
	"""Return True if the group is referenced by any Assessment Plan."""
	return bool(frappe.db.exists("Assessment Plan", {"assessment_group": group_name}))


def update_assessment_group(old_name: str, new_name: str) -> str:
	"""Rename a leaf Assessment Group (exam type) node."""
	previous_name = (old_name or "").strip()
	next_name = (new_name or "").strip()
	if previous_name == next_name:
		return previous_name
	if not check_assessment_group(previous_name):
		raise frappe.ValidationError(f"Assessment Group '{previous_name}' not found.")
	if check_assessment_group(next_name):
		raise frappe.ValidationError(f"Assessment Group '{next_name}' already exists.")
	doc = frappe.get_doc("Assessment Group", previous_name)
	if doc.is_group:
		raise frappe.ValidationError("Only exam types can be renamed.")
	sibling_exists = frappe.db.exists(
		"Assessment Group",
		{
			"parent_assessment_group": doc.parent_assessment_group,
			"assessment_group_name": next_name,
			"name": ["!=", previous_name],
		},
	)
	if sibling_exists:
		raise frappe.ValidationError(
			f"Exam type '{next_name}' already exists under this term."
		)
	try:
		doc.assessment_group_name = next_name
		if doc.name != next_name:
			frappe.rename_doc("Assessment Group", doc.name, next_name, force=True)
		else:
			doc.save()
		return next_name
	except Exception:
		frappe.db.rollback()
		raise


def delete_assessment_group(assessment_group_name: str) -> None:
	"""Delete an Assessment Group leaf node; block if it has children."""
	if not check_assessment_group(assessment_group_name):
		raise frappe.ValidationError(f"Assessment Group '{assessment_group_name}' not found.")
	child_count = frappe.db.count(
		"Assessment Group",
		{"parent_assessment_group": assessment_group_name},
	)
	if child_count > 0:
		raise frappe.ValidationError(
			f"Cannot delete '{assessment_group_name}' because it has child groups."
		)
	if is_assessment_group_linked(assessment_group_name):
		raise frappe.ValidationError(
			f"Cannot delete '{assessment_group_name}' because it is used in existing assessment plans."
		)
	try:
		frappe.delete_doc("Assessment Group", assessment_group_name)
	except Exception:
		frappe.db.rollback()
		raise


def _get_descendant_names(root_name: str) -> list[str]:
	"""Return root and all descendant Assessment Group names."""
	names = [root_name]
	children = frappe.get_all(
		"Assessment Group",
		filters={"parent_assessment_group": root_name},
		pluck="name",
	)
	for child in children:
		names.extend(_get_descendant_names(child))
	return names


def _build_subtree(root_name: str) -> list[dict]:
	"""Build nested tree starting from a given root node."""
	nodes = frappe.get_all(
		"Assessment Group",
		filters={"name": ["in", _get_descendant_names(root_name)]},
		fields=["name", "assessment_group_name", "parent_assessment_group", "is_group"],
		order_by="lft asc",
	)
	return _build_tree_from_nodes(nodes, root_name)


def _build_tree_from_nodes(nodes: list[dict], root_name: str) -> list[dict]:
	"""Convert flat node list to nested tree structure."""
	by_name = {node["name"]: {**node, "children": []} for node in nodes}
	roots: list[dict] = []
	for node in by_name.values():
		parent = node.get("parent_assessment_group")
		if parent and parent in by_name:
			by_name[parent]["children"].append(node)
		elif node["name"] == root_name or parent == ROOT_ASSESSMENT_GROUP:
			roots.append(node)
	if root_name in by_name and root_name not in roots:
		return [by_name[root_name]]
	return roots
