import { classifyAssessmentCycleLabel } from '@/lib/assessment-cycle-hints'

export type PlanSubjectCategory = 'main' | 'skill' | 'co-scholastic'

export interface PlanCriteriaRowInput {
  readonly assessmentCriteria: string
  readonly maxMarks: string
}

export interface ValidateAssessmentPlanFormInput {
  readonly subjectCategories: readonly PlanSubjectCategory[]
  readonly cycleLabel: string
  readonly cycleId: string
  readonly maximumAssessmentScore: string
  readonly criteria: readonly PlanCriteriaRowInput[]
}

const MAIN_INTERNAL_TOTAL = 20
const SKILL_INTERNAL_TOTAL = 50
const MAIN_PT_MAX = 80
const SKILL_PT_MAX = 50
const CO_SCHOLASTIC_MAX = 5

const parseScore = (value: string): number | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const getCriteriaTotal = (criteria: readonly PlanCriteriaRowInput[]): number =>
  criteria.reduce((sum, row) => {
    if (row.assessmentCriteria.trim().length === 0) {
      return sum
    }
    const marks = parseScore(row.maxMarks)
    return sum + (marks ?? 0)
  }, 0)

/** Validates CBSE assessment plan rules on the create/edit form. */
export const validateAssessmentPlanForm = ({
  subjectCategories,
  cycleLabel,
  cycleId,
  maximumAssessmentScore,
  criteria,
}: ValidateAssessmentPlanFormInput): readonly string[] => {
  const messages: string[] = []
  const uniqueCategories = [...new Set(subjectCategories)]
  const cycleHints = classifyAssessmentCycleLabel(cycleLabel, cycleId)
  const maxScore = parseScore(maximumAssessmentScore)
  const criteriaTotal = getCriteriaTotal(criteria)
  const hasMainSubject = uniqueCategories.includes('main')
  const hasSkillSubject = uniqueCategories.includes('skill')
  const hasCoScholasticSubject = uniqueCategories.includes('co-scholastic')
  if (cycleHints.isPt) {
    if (hasMainSubject && maxScore !== null && maxScore > MAIN_PT_MAX) {
      messages.push(`PT must not exceed ${MAIN_PT_MAX} marks for main subjects.`)
    }
    if (hasSkillSubject && maxScore !== null && maxScore > SKILL_PT_MAX) {
      messages.push(`PT must not exceed ${SKILL_PT_MAX} marks for skill subjects.`)
    }
  }
  if (cycleHints.isInternal) {
    if (hasMainSubject && criteriaTotal !== MAIN_INTERNAL_TOTAL) {
      messages.push(
        `Main subject internal criteria must sum to exactly ${MAIN_INTERNAL_TOTAL} (PT 5 + MA 5 + SEA 5 + Portfolio 5). Current total: ${criteriaTotal}.`,
      )
    }
    if (hasSkillSubject && criteriaTotal !== SKILL_INTERNAL_TOTAL) {
      messages.push(
        `Skill subject internal criteria must sum to exactly ${SKILL_INTERNAL_TOTAL} (PT 5 + MA 5 + SEA 5 + Portfolio 5 + Practical 30). Current total: ${criteriaTotal}.`,
      )
    }
    if (hasMainSubject && hasSkillSubject) {
      messages.push(
        'Bulk save cannot use one internal criteria set for both main (20) and skill (50) subjects. Save them separately or adjust selected courses.',
      )
    }
  }
  if (hasCoScholasticSubject) {
    if (cycleHints.isPt || cycleHints.isMainExam) {
      messages.push('Co-scholastic subjects must not use PT or theory/main exam groups.')
    }
    if (maxScore !== null && maxScore > CO_SCHOLASTIC_MAX) {
      messages.push('Co-scholastic subjects must use the 5-point scale only (maximum 5 marks).')
    }
  }
  return messages
}

export const getInternalCriteriaHint = (
  subjectCategories: readonly PlanSubjectCategory[],
  cycleLabel: string,
  cycleId: string,
): string | null => {
  const cycleHints = classifyAssessmentCycleLabel(cycleLabel, cycleId)
  if (!cycleHints.isInternal) {
    return null
  }
  const uniqueCategories = [...new Set(subjectCategories)]
  const hints: string[] = []
  if (uniqueCategories.includes('main')) {
    hints.push('Main: PT 5 + MA 5 + SEA 5 + Portfolio 5 = 20')
  }
  if (uniqueCategories.includes('skill')) {
    hints.push('Skill: PT 5 + MA 5 + SEA 5 + Portfolio 5 + Practical 30 = 50')
  }
  return hints.length > 0 ? hints.join(' · ') : null
}

export const getPtCapHint = (
  subjectCategories: readonly PlanSubjectCategory[],
  cycleLabel: string,
  cycleId: string,
): string | null => {
  const cycleHints = classifyAssessmentCycleLabel(cycleLabel, cycleId)
  if (!cycleHints.isPt) {
    return null
  }
  const uniqueCategories = [...new Set(subjectCategories)]
  const hints: string[] = []
  if (uniqueCategories.includes('main')) {
    hints.push(`Main PT max ${MAIN_PT_MAX}`)
  }
  if (uniqueCategories.includes('skill')) {
    hints.push(`Skill PT max ${SKILL_PT_MAX}`)
  }
  return hints.length > 0 ? hints.join(' · ') : null
}
