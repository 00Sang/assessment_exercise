"""Relaxes Education Assessment Plan validation for the scheme builder exercise."""

from education.education.doctype.assessment_plan.assessment_plan import AssessmentPlan


class AssessmentPlanOverride(AssessmentPlan):
	"""Assessment Plan without Education's criteria-total vs max-score check."""

	def validate_max_score(self) -> None:
		"""Skip the rule that criteria marks must equal maximum assessment score."""
		return
