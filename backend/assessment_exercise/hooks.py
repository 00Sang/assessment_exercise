app_name = "assessment_exercise"
app_title = "Assessment Exercise"
app_publisher = "Assessment Scheme Builder"
app_description = "CBSE Class VI-VIII assessment scheme builder APIs"
app_email = "dev@example.com"
app_license = "MIT"

required_apps = ["frappe", "education"]

override_doctype_class = {
	"Assessment Plan": "assessment_exercise.overrides.assessment_plan_override.AssessmentPlanOverride",
}
