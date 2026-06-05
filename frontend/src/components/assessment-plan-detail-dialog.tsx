import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  ASSESSMENT_API,
  type AssessmentPlanRecord,
} from '@/lib/assessment-api-methods'
import { unwrapFrappeData, unwrapFrappeError } from '@/lib/frappe-api'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useEffect, useState } from 'react'

export interface AssessmentPlanDetailDialogProps {
  readonly plan: AssessmentPlanRecord | null
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onEdit?: (plan: AssessmentPlanRecord) => void
}

interface DetailFieldProps {
  readonly label: string
  readonly value: string | null | undefined
}

const formatDisplayValue = (value: string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '—'
  }
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : '—'
}

const DetailField = ({ label, value }: DetailFieldProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="text-sm">{formatDisplayValue(value)}</span>
  </div>
)

/**
 * Modal showing full Assessment Plan fields and criteria rows.
 */
export function AssessmentPlanDetailDialog({
  plan,
  onOpenChange,
  onEdit,
}: AssessmentPlanDetailDialogProps) {
  const { call: fetchPlanDetail } = useFrappePostCall(ASSESSMENT_API.getAssessmentPlanDetail)
  const [planDetail, setPlanDetail] = useState<AssessmentPlanRecord | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isOpen = plan !== null
  const planName = plan?.name ?? ''

  useEffect(() => {
    if (!isOpen || !plan) {
      setPlanDetail(null)
      setLoadError(null)
      return
    }
    if (!planName) {
      setPlanDetail(plan)
      setLoadError(null)
      return
    }
    let isCancelled = false
    const loadDetail = async (): Promise<void> => {
      setIsLoading(true)
      setLoadError(null)
      setPlanDetail(plan)
      try {
        const response = await fetchPlanDetail({ name: planName })
        if (isCancelled) {
          return
        }
        const apiError = unwrapFrappeError(response)
        if (apiError) {
          setLoadError(apiError)
          return
        }
        const detail = unwrapFrappeData<AssessmentPlanRecord>(response)
        if (!detail) {
          setLoadError('Assessment plan not found.')
          return
        }
        setPlanDetail(detail)
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load plan detail')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }
    void loadDetail()
    return () => {
      isCancelled = true
    }
  }, [fetchPlanDetail, isOpen, plan, planName])

  const displayPlan = planDetail ?? plan

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{displayPlan?.assessmentName ?? 'Assessment plan'}</DialogTitle>
          <DialogDescription>
            Full plan record from the backend
            {displayPlan?.name ? ` · ${displayPlan.name}` : ''}
          </DialogDescription>
        </DialogHeader>
        {isLoading && planName.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Refreshing plan details...
          </div>
        ) : null}
        {loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not refresh plan</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}
        {displayPlan ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Document ID" value={displayPlan.name} />
              <DetailField label="Assessment name" value={displayPlan.assessmentName} />
              <DetailField
                label="Status"
                value={displayPlan.status ?? (displayPlan.docstatus === 1 ? 'Submitted' : 'Draft')}
              />
              <DetailField label="Class / program" value={displayPlan.program} />
              <DetailField label="Student group" value={displayPlan.studentGroup} />
              <DetailField label="Course" value={displayPlan.course} />
              <DetailField label="Grading scale" value={displayPlan.gradingScale} />
              <DetailField label="Academic year" value={displayPlan.academicYear} />
              <DetailField label="Academic term" value={displayPlan.academicTerm} />
              <DetailField
                label="Assessment group"
                value={displayPlan.assessmentGroupDoc ?? displayPlan.assessmentGroup}
              />
              <DetailField
                label="Maximum assessment score"
                value={
                  displayPlan.maximumAssessmentScore !== null &&
                  displayPlan.maximumAssessmentScore !== undefined
                    ? String(displayPlan.maximumAssessmentScore)
                    : null
                }
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailField label="Schedule date" value={displayPlan.schedule?.date} />
              <DetailField label="From time" value={displayPlan.schedule?.fromTime} />
              <DetailField label="To time" value={displayPlan.schedule?.toTime} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Assessment criteria</h3>
              {(displayPlan.criteria ?? []).length > 0 ? (
                <ul className="flex flex-col gap-2 rounded-lg border">
                  {(displayPlan.criteria ?? []).map((row) => (
                    <li
                      key={`${row.assessmentCriteria ?? 'criteria'}-${row.maxMarks}`}
                      className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0"
                    >
                      <span>{row.assessmentCriteria ?? '—'}</span>
                      <Badge variant="secondary">{row.maxMarks ?? '—'} marks</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {formatDisplayValue(displayPlan.criteriaSummary) !== '—'
                    ? displayPlan.criteriaSummary
                    : 'No criteria rows on this plan.'}
                </p>
              )}
            </div>
            {onEdit && displayPlan ? (
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(displayPlan)
                  }}
                >
                  Edit plan
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
