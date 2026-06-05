/** Subject classification for CBSE Class VI–VIII scheme rules. */
export type SubjectType = 'CORE' | 'LANGUAGE' | 'SKILL' | 'CO_SCHOLASTIC'

export type TermId = 'term-1' | 'term-2'

export interface CourseDefinition {
  readonly id: string
  readonly label: string
  readonly subjectType: SubjectType
}

export interface AssessmentGroupDefinition {
  readonly id: string
  readonly label: string
  /** Expected maximum marks for main/skill theory-style groups; null when N/A. */
  readonly expectedMaxMarks: number | null
}

export interface TermStructureDefinition {
  readonly id: TermId
  readonly label: string
  readonly groups: readonly AssessmentGroupDefinition[]
}

export const COURSE_DEFINITIONS: readonly CourseDefinition[] = [
  { id: 'english', label: 'English', subjectType: 'CORE' },
  { id: 'mathematics', label: 'Mathematics', subjectType: 'CORE' },
  { id: 'science', label: 'Science', subjectType: 'CORE' },
  { id: 'social-science', label: 'Social Science', subjectType: 'CORE' },
  { id: 'hindi', label: 'Hindi', subjectType: 'LANGUAGE' },
  { id: 'mizo', label: 'Mizo', subjectType: 'LANGUAGE' },
  { id: 'manipuri', label: 'Manipuri', subjectType: 'LANGUAGE' },
  { id: 'coding', label: 'Coding', subjectType: 'SKILL' },
  { id: 'art-education', label: 'Art Education', subjectType: 'CO_SCHOLASTIC' },
  { id: 'life-skills', label: 'Life Skills', subjectType: 'CO_SCHOLASTIC' },
  { id: 'hpe-work-experience', label: 'HPE & Work Experience', subjectType: 'CO_SCHOLASTIC' },
]

const TERM_I_MAIN_GROUPS: readonly AssessmentGroupDefinition[] = [
  { id: 'pt-1', label: 'PT-I', expectedMaxMarks: 80 },
  { id: 'internal-1', label: 'Internal Assessment (Term I)', expectedMaxMarks: 20 },
  { id: 'half-yearly', label: 'Half Yearly', expectedMaxMarks: 80 },
]

const TERM_II_MAIN_GROUPS: readonly AssessmentGroupDefinition[] = [
  { id: 'pt-2', label: 'PT-II', expectedMaxMarks: 80 },
  { id: 'internal-2', label: 'Internal Assessment (Term II)', expectedMaxMarks: 20 },
  { id: 'yearly', label: 'Yearly', expectedMaxMarks: 80 },
]

const TERM_I_SKILL_GROUPS: readonly AssessmentGroupDefinition[] = [
  { id: 'pt-1', label: 'PT-I (Theory 50)', expectedMaxMarks: 50 },
  { id: 'internal-1', label: 'Internal Assessment (Term I)', expectedMaxMarks: 50 },
]

const TERM_II_SKILL_GROUPS: readonly AssessmentGroupDefinition[] = [
  { id: 'pt-2', label: 'PT-II (Theory 50)', expectedMaxMarks: 50 },
  { id: 'internal-2', label: 'Internal Assessment (Term II)', expectedMaxMarks: 50 },
]

const TERM_I_CO_SCHOLASTIC_GROUPS: readonly AssessmentGroupDefinition[] = [
  { id: 'internal-1', label: 'School-Based Assessment (Term I)', expectedMaxMarks: 5 },
]

const TERM_II_CO_SCHOLASTIC_GROUPS: readonly AssessmentGroupDefinition[] = [
  { id: 'internal-2', label: 'School-Based Assessment (Term II)', expectedMaxMarks: 5 },
]

export const TERM_STRUCTURES: readonly TermStructureDefinition[] = [
  { id: 'term-1', label: 'Term I', groups: TERM_I_MAIN_GROUPS },
  { id: 'term-2', label: 'Term II', groups: TERM_II_MAIN_GROUPS },
]

/** Returns required assessment groups for a subject type within a term. */
export const getRequiredGroupsForSubjectType = (
  subjectType: SubjectType,
  termId: TermId,
): readonly AssessmentGroupDefinition[] => {
  if (subjectType === 'SKILL') {
    return termId === 'term-1' ? TERM_I_SKILL_GROUPS : TERM_II_SKILL_GROUPS
  }
  if (subjectType === 'CO_SCHOLASTIC') {
    return termId === 'term-1' ? TERM_I_CO_SCHOLASTIC_GROUPS : TERM_II_CO_SCHOLASTIC_GROUPS
  }
  return termId === 'term-1' ? TERM_I_MAIN_GROUPS : TERM_II_MAIN_GROUPS
}

export const getCoursesBySubjectType = (
  subjectType: SubjectType,
): readonly CourseDefinition[] =>
  COURSE_DEFINITIONS.filter((course) => course.subjectType === subjectType)
