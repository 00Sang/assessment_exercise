import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  ASSESSMENT_API,
  type PlanFormOptions,
  type TermSchemeData,
  type TermSchemePlanSnapshot,
} from '@/lib/assessment-api-methods'
import { mapApiCoursesForValidation } from '@/lib/map-courses-for-validation'
import { unwrapFrappeData, unwrapFrappeError } from '@/lib/frappe-api'
import {
  validateTermScheme,
  type ConfiguredPlanSnapshot,
  type TermValidationIssue,
} from '@/lib/validate-term-scheme'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XCircleIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const EMPTY_PLAN_FORM_OPTIONS: PlanFormOptions = {
  programs: [],
  courses: [],
  academicYears: [],
  academicTerms: [],
}

const getIssueIcon = (severity: TermValidationIssue['severity']) => {
  if (severity === 'error') {
    return <XCircleIcon className="h-4 w-4 shrink-0" />
  }
  return <TriangleAlertIcon className="h-4 w-4 shrink-0" />
}

const formatPlanCriteria = (plan: TermSchemePlanSnapshot): string => {
  if (plan.criteria && plan.criteria.length > 0) {
    return plan.criteria
      .map((row) => `${row.assessmentCriteria} (${row.maxMarks ?? '—'})`)
      .join(' + ')
  }
  return plan.criteriaSummary.length > 0 ? plan.criteriaSummary : 'No criteria rows'
}

const SCHEME_VALIDATION_CHECKS: readonly string[] = [
  'Main subjects: theory exam (Half Yearly / Yearly) + Internal Assessment = 100',
  'Skill subjects: PT + Internal Assessment = 100',
]

const SCHEME_VALIDATION_SCOPE =
  'Only subjects with both relevant plans configured are checked. Missing plans are not flagged here.'

/**
 * Scheme viewer and CBSE rule validator backed by get_term_scheme API data.
 */
export const TermSchemePage = () => {
  const [programName, setProgramName] = useState<string>('')
  const [academicYear, setAcademicYear] = useState<string>('')
  const {
    data: planFormOptionsResponse,
    isLoading: isLoadingPlanFormOptions,
  } = useFrappeGetCall(ASSESSMENT_API.getPlanFormOptions, undefined, 'term-scheme-form-options')
  const planFormOptions =
    unwrapFrappeData<PlanFormOptions>(planFormOptionsResponse) ?? EMPTY_PLAN_FORM_OPTIONS
  const planFormOptionsError = unwrapFrappeError(planFormOptionsResponse)
  const programOptions = planFormOptions.programs
  const courseOptions = planFormOptions.courses
  const academicYearOptions = planFormOptions.academicYears
  const coursesForValidation = useMemo(
    () => mapApiCoursesForValidation(courseOptions),
    [courseOptions],
  )
  useEffect(() => {
    if (isLoadingPlanFormOptions) {
      return
    }
    if (programOptions.length > 0 && programName.length === 0) {
      setProgramName(programOptions[0].program_name)
    }
    if (academicYearOptions.length > 0 && academicYear.length === 0) {
      setAcademicYear(academicYearOptions[0].academic_year_name)
    }
  }, [
    academicYear,
    academicYearOptions,
    isLoadingPlanFormOptions,
    programName,
    programOptions,
  ])

  const { call: fetchTermScheme } = useFrappePostCall(ASSESSMENT_API.getTermScheme)
  const [termSchemeResponse, setTermSchemeResponse] = useState<unknown>(null)
  const [isLoadingTermScheme, setIsLoadingTermScheme] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<Error | null>(null)
  const filtersReady = programName.length > 0 && academicYear.length > 0

  useEffect(() => {
    if (!filtersReady) {
      setTermSchemeResponse(null)
      setFetchError(null)
      return
    }
    let isCancelled = false
    const loadTermScheme = async (): Promise<void> => {
      setIsLoadingTermScheme(true)
      setFetchError(null)
      try {
        const response = await fetchTermScheme({
          program: programName,
          academic_year: academicYear,
        })
        if (!isCancelled) {
          setTermSchemeResponse(response)
        }
      } catch (error) {
        if (!isCancelled) {
          setFetchError(error instanceof Error ? error : new Error('Failed to load term scheme'))
          setTermSchemeResponse(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTermScheme(false)
        }
      }
    }
    void loadTermScheme()
    return () => {
      isCancelled = true
    }
  }, [academicYear, fetchTermScheme, filtersReady, programName])

  const termScheme = unwrapFrappeData<TermSchemeData>(termSchemeResponse)
  const apiError = unwrapFrappeError(termSchemeResponse)
  const configuredGroups = termScheme?.configuredGroups ?? []
  const assessmentCriteria = termScheme?.assessmentCriteria ?? []
  const configuredCriteriaNames = assessmentCriteria
    .map((row) => row.assessment_criteria)
    .filter((name) => name.length > 0)
  const configuredPlans: readonly ConfiguredPlanSnapshot[] = (termScheme?.plans ?? []).map(
    (plan) => ({
      courseId: plan.courseId,
      courseLabel: plan.courseLabel,
      subjectType: plan.subjectType as ConfiguredPlanSnapshot['subjectType'],
      assessmentGroupId: plan.assessmentGroupId,
      assessmentGroupLabel: plan.assessmentGroupLabel,
      maximumAssessmentScore: plan.maximumAssessmentScore,
      criteriaSummary: plan.criteriaSummary,
    }),
  )

  const validationIssues = useMemo(
    () =>
      validateTermScheme({
        programName,
        academicYear,
        configuredGroups,
        plans: configuredPlans,
        courses: coursesForValidation,
        configuredCriteriaNames,
      }),
    [
      academicYear,
      configuredCriteriaNames,
      configuredGroups,
      configuredPlans,
      coursesForValidation,
      programName,
    ],
  )
  const errorCount = validationIssues.filter((issue) => issue.severity === 'error').length
  const warningCount = validationIssues.filter((issue) => issue.severity === 'warning').length
  const hasValidationIssues = validationIssues.length > 0

  const findPlanForCell = (
    courseId: string,
    groupId: string,
  ): TermSchemePlanSnapshot | undefined =>
    termScheme?.plans.find(
      (plan) => plan.courseId === courseId && plan.assessmentGroupId === groupId,
    )

  const getConfiguredPlanCountForGroup = (groupId: string): number =>
    courseOptions.filter((course) => findPlanForCell(course.id, groupId)).length

  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle>Configured assessment scheme</CardTitle>
        <CardDescription>
          View saved plans and verify mark totals for the selected class and academic year. Checks
          theory + internal for main subjects and PT + internal for skill subjects when both plans
          exist.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {planFormOptionsError ? (
          <Alert variant="destructive">
            <AlertTitle>Failed to load filter options</AlertTitle>
            <AlertDescription>{planFormOptionsError}</AlertDescription>
          </Alert>
        ) : null}
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="scheme-program">Program</FieldLabel>
            <Select
              value={programName}
              onValueChange={setProgramName}
              disabled={isLoadingPlanFormOptions || programOptions.length === 0}
            >
              <SelectTrigger id="scheme-program">
                <SelectValue
                  placeholder={
                    isLoadingPlanFormOptions
                      ? 'Loading programs...'
                      : 'No programs found — run seed'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {programOptions.map((option) => (
                    <SelectItem key={option.name} value={option.program_name}>
                      {option.program_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="scheme-year">Academic Year</FieldLabel>
            <Select
              value={academicYear}
              onValueChange={setAcademicYear}
              disabled={isLoadingPlanFormOptions || academicYearOptions.length === 0}
            >
              <SelectTrigger id="scheme-year">
                <SelectValue
                  placeholder={
                    isLoadingPlanFormOptions
                      ? 'Loading academic years...'
                      : 'No academic years found — run seed'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {academicYearOptions.map((year) => (
                    <SelectItem key={year.name} value={year.academic_year_name}>
                      {year.academic_year_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        {(fetchError || apiError) && (
          <Alert variant="destructive">
            <AlertTitle>Failed to load term scheme</AlertTitle>
            <AlertDescription>
              {apiError ?? (fetchError instanceof Error ? fetchError.message : 'Unknown error')}
            </AlertDescription>
          </Alert>
        )}

        {isLoadingTermScheme ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Loading term scheme from backend...
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={hasValidationIssues ? 'destructive' : 'default'}>
            {hasValidationIssues
              ? `${warningCount + errorCount} issue(s) found`
              : 'No total mark issues'}
          </Badge>
          {errorCount > 0 && <Badge variant="destructive">{errorCount} error(s)</Badge>}
          {warningCount > 0 && <Badge variant="secondary">{warningCount} warning(s)</Badge>}
          <Badge variant="outline">
            {programName} · {academicYear}
          </Badge>
          <Badge variant="outline">{configuredGroups.length} exam type(s)</Badge>
          <Badge variant="outline">{configuredPlans.length} plan(s)</Badge>
          <Badge variant="outline">{configuredCriteriaNames.length} criteria</Badge>
        </div>

        <Alert>
          <InfoIcon />
          <AlertTitle>What this tab checks</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4">
              {SCHEME_VALIDATION_CHECKS.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">{SCHEME_VALIDATION_SCOPE}</p>
          </AlertDescription>
        </Alert>

        <Separator />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Assessment Criteria (backend)</h3>
              {configuredCriteriaNames.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {assessmentCriteria.map((row) => (
                    <li key={row.name ?? row.assessment_criteria}>
                      <Badge variant="secondary">{row.assessment_criteria}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No criteria saved yet. Add them in the Assessment Criteria tab.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Assessment Group tree (backend)</h3>
              {configuredGroups.length > 0 ? (
                <Accordion type="multiple" className="w-full rounded-lg border px-3">
                  {configuredGroups.map((group) => {
                    const groupLabel = group.label?.trim() || group.id
                    const configuredPlanCount = getConfiguredPlanCountForGroup(group.id)
                    return (
                      <AccordionItem key={group.id} value={group.id} className="border-b last:border-b-0">
                        <AccordionTrigger className="px-1 hover:no-underline">
                          <span className="flex flex-1 flex-wrap items-center gap-2 pr-2">
                            <span className="font-medium">{groupLabel}</span>
                            <Badge variant="default">In tree</Badge>
                            <Badge variant="outline">
                              {configuredPlanCount}/{courseOptions.length} plans
                            </Badge>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-1">
                          <ul className="flex flex-col gap-1 text-sm">
                            {courseOptions.map((course) => {
                              const plan = findPlanForCell(course.id, group.id)
                              return (
                                <li
                                  key={`${course.id}-${group.id}`}
                                  className="flex flex-col gap-0.5 rounded bg-muted/40 px-2 py-1.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span>{course.course_name}</span>
                                    {plan ? (
                                      <span className="text-xs text-muted-foreground">
                                        {plan.maximumAssessmentScore ?? '—'} marks
                                      </span>
                                    ) : (
                                      <span className="text-xs text-destructive">No plan</span>
                                    )}
                                  </div>
                                  {plan ? (
                                    <span className="text-xs text-muted-foreground">
                                      {formatPlanCriteria(plan)}
                                    </span>
                                  ) : null}
                                </li>
                              )
                            })}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No exam types under {academicYear} for {programName}. Add them in the
                  Assessment Group tab.
                </p>
              )}
            </div>

            {configuredPlans.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Saved plans (backend, filtered)</h3>
                <ul className="flex flex-col gap-2">
                  {termScheme?.plans.map((plan) => (
                    <li
                      key={`${plan.courseId}-${plan.assessmentGroupId}-${plan.courseLabel}`}
                      className="rounded border px-3 py-2 text-sm"
                    >
                      <div className="font-medium">
                        {plan.courseLabel} · {plan.assessmentGroupLabel}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {plan.maximumAssessmentScore ?? '—'} marks · {formatPlanCriteria(plan)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved plans match {programName} · {academicYear}. Create plans in the
                Assessment Plan tab.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium">Validation results</h3>
            <Alert>
              <InfoIcon />
              <AlertTitle>Checks performed</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc pl-4">
                  {SCHEME_VALIDATION_CHECKS.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
            {!hasValidationIssues ? (
              <Alert>
                <CheckCircle2Icon />
                <AlertTitle>No total mark issues</AlertTitle>
                <AlertDescription>
                  For subjects where both plans exist, theory + internal (main) and PT + internal
                  (skill) totals equal 100. Subjects without both plans were skipped.
                </AlertDescription>
              </Alert>
            ) : (
              <ul className="flex flex-col gap-2">
                {validationIssues.map((issue) => (
                  <li
                    key={issue.id}
                    className={`flex gap-2 rounded border px-3 py-2 text-sm ${
                      issue.severity === 'error'
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'border-amber-500/40 bg-amber-500/5'
                    }`}
                  >
                    {getIssueIcon(issue.severity)}
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
