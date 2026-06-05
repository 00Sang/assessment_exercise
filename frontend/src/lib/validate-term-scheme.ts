import { classifyAssessmentCycleLabel } from '@/lib/assessment-cycle-hints'
import type { TermSchemeGroupSnapshot } from '@/lib/assessment-api-methods'
import { type CourseDefinition, type SubjectType } from '@/data/cbse-assessment-structure'

export type ValidationSeverity = 'error' | 'warning'

export interface TermValidationIssue {
  readonly id: string
  readonly severity: ValidationSeverity
  readonly message: string
  readonly courseLabel?: string
  readonly groupLabel?: string
}

export interface ConfiguredPlanSnapshot {
  readonly courseId: string
  readonly courseLabel: string
  readonly subjectType: SubjectType
  readonly assessmentGroupId: string
  readonly assessmentGroupLabel: string
  readonly maximumAssessmentScore: number | null
  readonly criteriaSummary: string
}

interface ValidateTermSchemeInput {
  readonly programName: string
  readonly academicYear: string
  readonly configuredGroups: readonly TermSchemeGroupSnapshot[]
  readonly plans: readonly ConfiguredPlanSnapshot[]
  readonly courses: readonly CourseDefinition[]
  readonly configuredCriteriaNames: readonly string[]
}

const findPlan = (
  plans: readonly ConfiguredPlanSnapshot[],
  courseId: string,
  groupId: string,
): ConfiguredPlanSnapshot | undefined =>
  plans.find((plan) => plan.courseId === courseId && plan.assessmentGroupId === groupId)

const getGroupLabel = (group: TermSchemeGroupSnapshot): string => (group.label ?? '').trim()

const findGroupByHint = (
  groups: readonly TermSchemeGroupSnapshot[],
  matcher: (label: string) => boolean,
): TermSchemeGroupSnapshot | undefined =>
  groups.find((group) => matcher(getGroupLabel(group)))

/** Validates CBSE scheme rules from API groups, plans, and criteria. */
export const validateTermScheme = ({
  programName,
  academicYear,
  configuredGroups,
  plans,
  courses,
}: ValidateTermSchemeInput): readonly TermValidationIssue[] => {
  const issues: TermValidationIssue[] = []
  const scopeLabel =
    programName.length > 0 && academicYear.length > 0
      ? `${programName} · ${academicYear}`
      : 'the selected program and year'
  if (configuredGroups.length === 0) {
    issues.push({
      id: 'no-configured-groups',
      severity: 'error',
      message: `${scopeLabel}: no exam types found in the Assessment Group tree for this academic year.`,
    })
    return issues
  }
  const subjectTypes: readonly SubjectType[] = ['CORE', 'LANGUAGE', 'SKILL', 'CO_SCHOLASTIC']
  subjectTypes.forEach((subjectType) => {
    const subjectCourses = courses.filter((course) => course.subjectType === subjectType)
    if (subjectType === 'CORE' || subjectType === 'LANGUAGE') {
      const internalGroup = findGroupByHint(
        configuredGroups,
        (label) => classifyAssessmentCycleLabel(label).isInternal,
      )
      const mainExamGroup = findGroupByHint(
        configuredGroups,
        (label) => classifyAssessmentCycleLabel(label).isMainExam,
      )
      subjectCourses.forEach((course) => {
        if (!internalGroup || !mainExamGroup) {
          return
        }
        const internalPlan = findPlan(plans, course.id, internalGroup.id)
        const mainPlan = findPlan(plans, course.id, mainExamGroup.id)
        if (
          internalPlan &&
          mainPlan &&
          internalPlan.maximumAssessmentScore !== null &&
          mainPlan.maximumAssessmentScore !== null
        ) {
          const termTotal =
            internalPlan.maximumAssessmentScore + mainPlan.maximumAssessmentScore
          if (termTotal !== 100) {
            issues.push({
              id: `term-total-main-${course.id}`,
              severity: 'warning',
              message: `${course.label}: ${getGroupLabel(mainExamGroup)} (${mainPlan.maximumAssessmentScore}) + ${getGroupLabel(internalGroup)} (${internalPlan.maximumAssessmentScore}) must equal 100.`,
              courseLabel: course.label,
            })
          }
        }
      })
    }
    if (subjectType === 'SKILL') {
      const ptGroup = findGroupByHint(
        configuredGroups,
        (label) => classifyAssessmentCycleLabel(label).isPt,
      )
      const internalGroup = findGroupByHint(
        configuredGroups,
        (label) => classifyAssessmentCycleLabel(label).isInternal,
      )
      subjectCourses.forEach((course) => {
        if (!ptGroup || !internalGroup) {
          return
        }
        const ptPlan = findPlan(plans, course.id, ptGroup.id)
        const internalPlan = findPlan(plans, course.id, internalGroup.id)
        if (
          ptPlan &&
          internalPlan &&
          ptPlan.maximumAssessmentScore !== null &&
          internalPlan.maximumAssessmentScore !== null
        ) {
          const termTotal = ptPlan.maximumAssessmentScore + internalPlan.maximumAssessmentScore
          if (termTotal !== 100) {
            issues.push({
              id: `term-total-skill-${course.id}`,
              severity: 'warning',
              message: `${course.label}: ${getGroupLabel(ptGroup)} (${ptPlan.maximumAssessmentScore}) + ${getGroupLabel(internalGroup)} (${internalPlan.maximumAssessmentScore}) must equal 100.`,
              courseLabel: course.label,
            })
          }
        }
      })
    }
  })
  return issues
}
