/** Frappe whitelisted method paths for the assessment_exercise app. */
export const ASSESSMENT_API = {
  ping: 'assessment_exercise.api.ping',
  getAssessmentCriteria: 'assessment_exercise.api.get_assessment_criteria',
  getGradingScales: 'assessment_exercise.api.get_grading_scales',
  getPlanFormOptions: 'assessment_exercise.api.get_plan_form_options',
  createAssessmentCriteria: 'assessment_exercise.api.create_assessment_criteria',
  updateAssessmentCriteria: 'assessment_exercise.api.update_assessment_criteria',
  deleteAssessmentCriteria: 'assessment_exercise.api.delete_assessment_criteria',
  getAssessmentGroups: 'assessment_exercise.api.get_assessment_groups',
  bulkCreateAssessmentGroups: 'assessment_exercise.api.bulk_create_assessment_groups',
  updateAssessmentGroup: 'assessment_exercise.api.update_assessment_group',
  deleteAssessmentGroup: 'assessment_exercise.api.delete_assessment_group',
  saveAssessmentPlan: 'assessment_exercise.api.save_assessment_plan',
  getAssessmentPlanDetail: 'assessment_exercise.api.get_assessment_plan_detail',
  listAssessmentPlans: 'assessment_exercise.api.list_assessment_plans',
  getTermScheme: 'assessment_exercise.api.get_term_scheme',
  getAssessmentScheme: 'assessment_exercise.api.get_assessment_scheme',
} as const

export interface AssessmentCriteriaRow {
  readonly name?: string
  readonly assessment_criteria: string
  readonly assessment_criteria_group?: string
}

export interface GradingScaleRow {
  readonly name: string
  readonly grading_scale_name: string
  readonly description?: string
  readonly docstatus?: number
}

export interface ProgramRow {
  readonly name: string
  readonly program_name: string
}

export interface CourseRow {
  readonly id: string
  readonly name: string
  readonly course_name: string
  readonly subjectType: 'main' | 'skill' | 'co-scholastic'
  readonly schemeSubjectType: 'CORE' | 'LANGUAGE' | 'SKILL' | 'CO_SCHOLASTIC'
}

export interface AcademicYearRow {
  readonly name: string
  readonly academic_year_name: string
}

export interface AcademicTermRow {
  readonly name: string
  readonly term_name: string
  readonly term_id: string
  readonly academic_year: string
}

export interface PlanFormOptions {
  readonly programs: readonly ProgramRow[]
  readonly courses: readonly CourseRow[]
  readonly academicYears: readonly AcademicYearRow[]
  readonly academicTerms: readonly AcademicTermRow[]
}

export interface AssessmentPlanCriteriaRow {
  readonly assessmentCriteria: string
  readonly maxMarks: number | null
}

export interface AssessmentPlanRecord {
  readonly name?: string
  readonly docstatus?: number
  readonly status?: string
  readonly assessmentName: string
  readonly studentGroup: string | null
  readonly course: string
  readonly program: string | null
  readonly assessmentGroup: string
  readonly assessmentGroupDoc?: string
  readonly gradingScale: string
  readonly academicYear: string | null
  readonly academicTerm: string | null
  readonly schedule: {
    readonly date: string
    readonly fromTime: string
    readonly toTime: string
  }
  readonly maximumAssessmentScore: number | null
  readonly criteria: readonly AssessmentPlanCriteriaRow[]
  readonly criteriaSummary: string
}

export interface AssessmentGroupTreeNode {
  readonly name: string
  readonly assessment_group_name: string
  readonly parent_assessment_group?: string
  readonly is_group?: number
  readonly children?: readonly AssessmentGroupTreeNode[]
}

export interface TermSchemePlanCriteriaRow {
  readonly assessmentCriteria: string
  readonly maxMarks: number | null
}

export interface TermSchemeGroupSnapshot {
  readonly id: string
  readonly label: string
}

export interface TermSchemePlanSnapshot {
  readonly courseId: string
  readonly courseLabel: string
  readonly subjectType: string
  readonly assessmentGroupId: string
  readonly assessmentGroupLabel: string
  readonly maximumAssessmentScore: number | null
  readonly criteriaSummary: string
  readonly criteria?: readonly TermSchemePlanCriteriaRow[]
}

export interface TermSchemeData {
  readonly program: string
  readonly academicYear: string
  readonly termId: string
  readonly termLabel: string
  readonly configuredGroups: readonly TermSchemeGroupSnapshot[]
  readonly assessmentCriteria: readonly AssessmentCriteriaRow[]
  readonly plans: readonly TermSchemePlanSnapshot[]
}
