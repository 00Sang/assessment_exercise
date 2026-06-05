"""Slug-to-Frappe name mappings and CBSE scheme constants."""

ROOT_ASSESSMENT_GROUP = "All Assessment Groups"

PROGRAM_SLUG_TO_NAME: dict[str, str] = {
	"VI": "Class VI",
	"VII": "Class VII",
	"VIII": "Class VIII",
	"Class VI": "Class VI",
	"Class VII": "Class VII",
	"Class VIII": "Class VIII",
}

COURSE_SLUG_TO_NAME: dict[str, str] = {
	"english": "English",
	"mathematics": "Mathematics",
	"science": "Science",
	"social-science": "Social Science",
	"hindi": "Hindi",
	"mizo": "Mizo",
	"manipuri": "Manipuri",
	"coding": "Coding",
	"art-education": "Art Education",
	"life-skills": "Life Skills",
	"hpe-work-experience": "HPE & Work Experience",
}

COURSE_SUBJECT_TYPE: dict[str, str] = {
	"english": "CORE",
	"mathematics": "CORE",
	"science": "CORE",
	"social-science": "CORE",
	"hindi": "LANGUAGE",
	"mizo": "LANGUAGE",
	"manipuri": "LANGUAGE",
	"coding": "SKILL",
	"art-education": "CO_SCHOLASTIC",
	"life-skills": "CO_SCHOLASTIC",
	"hpe-work-experience": "CO_SCHOLASTIC",
}

COURSE_LABELS: dict[str, str] = {
	slug: name for slug, name in COURSE_SLUG_TO_NAME.items()
}

STUDENT_GROUP_SLUG_TO_NAME: dict[str, str] = {
	"VI": "Class VI",
	"VII": "Class VII",
	"VIII": "Class VIII",
	"Class VI": "Class VI",
	"Class VII": "Class VII",
	"Class VIII": "Class VIII",
}

TERM_ID_TO_LABEL: dict[str, str] = {
	"term-1": "Term I",
	"term-2": "Term II",
}

TERM_LABEL_TO_ID: dict[str, str] = {
	"Term I": "term-1",
	"Term II": "term-2",
	"Term 1": "term-1",
	"Term 2": "term-2",
}

# Maps frontend cycle slug -> exam name stored as Assessment Group leaf
CYCLE_SLUG_TO_EXAM_NAME: dict[str, str] = {
	"pt-1": "PT-I",
	"internal-1": "Internal Assessment (Term I)",
	"half-yearly": "Half Yearly",
	"pt-2": "PT-II",
	"internal-2": "Internal Assessment (Term II)",
	"yearly": "Yearly",
}

EXAM_NAME_TO_CYCLE_SLUG: dict[str, str] = {
	exam_name: slug for slug, exam_name in CYCLE_SLUG_TO_EXAM_NAME.items()
}

GRADING_SCALE_MAIN = "Grading 1"
GRADING_SCALE_SKILL = "Grading 2"
GRADING_SCALE_CO_SCHOLASTIC = "Grading 3"
GRADING_SCALE_DEFAULT = GRADING_SCALE_MAIN
GRADING_SCALE_LEGACY_ALIASES: dict[str, str] = {
	"Default Scholastic Grading Scale": GRADING_SCALE_MAIN,
	"Co-scholastic 5-Point Scale": GRADING_SCALE_CO_SCHOLASTIC,
}
