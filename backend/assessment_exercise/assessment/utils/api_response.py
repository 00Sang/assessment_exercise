"""Standard API response envelope helpers."""


def api_success(data):
	"""Return a successful API response envelope."""
	return {"success": True, "data": data}


def api_error(error: str):
	"""Return a failed API response envelope."""
	return {"success": False, "error": error}
