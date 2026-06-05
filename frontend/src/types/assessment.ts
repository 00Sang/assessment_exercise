/** Subject category in the CBSE Class VI–VIII scheme. */
export type SubjectCategory = 'main' | 'skill' | 'co-scholastic'

/** Class programs supported by this exercise. */
export type ProgramClass = 'VI' | 'VII' | 'VIII'

/** Assessment cycle identifiers (subset; extended when API is wired). */
export type AssessmentCycleId =
  | 'pt-1'
  | 'internal-1'
  | 'half-yearly'
  | 'pt-2'
  | 'internal-2'
  | 'yearly'

/** Single criteria row within a plan (API shape TBD). */
export interface AssessmentCriteriaRow {
  readonly id: string
  readonly name: string
  readonly maxMarks: number
}

/** Node in the scheme hierarchy returned by get_assessment_scheme. */
export interface SchemeCriteriaNode {
  readonly name: string
  readonly maxMarks: number
}

export interface SchemeSubjectNode {
  readonly course: string
  readonly category: SubjectCategory
  readonly criteria: readonly SchemeCriteriaNode[]
}

export interface SchemeCycleNode {
  readonly id: AssessmentCycleId
  readonly label: string
  readonly subjects: readonly SchemeSubjectNode[]
}

export interface SchemeTermNode {
  readonly id: 'term-1' | 'term-2'
  readonly label: string
  readonly cycles: readonly SchemeCycleNode[]
}

export interface AssessmentScheme {
  readonly program: ProgramClass
  readonly academicYear: string
  readonly terms: readonly SchemeTermNode[]
}
