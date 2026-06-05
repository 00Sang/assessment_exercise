import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import type { AssessmentGroupTreeNode } from '@/lib/assessment-api-methods'
import { cn } from '@/lib/utils'
import type { ParsedExamType } from '@/lib/parse-assessment-group-tree'
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  PencilIcon,
  XIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface AssessmentGroupTreeViewProps {
  readonly tree: readonly AssessmentGroupTreeNode[]
  readonly editingExamName: string | null
  readonly editDraftValue: string
  readonly isEditDuplicateName: boolean
  readonly deletingExamName: string | null
  readonly updatingExamName: string | null
  readonly isBusy: boolean
  readonly onEditDraftChange: (value: string) => void
  readonly onStartEditExamType: (examType: ParsedExamType) => void
  readonly onCancelEditExamType: () => void
  readonly onSaveEditExamType: () => void
  readonly onRequestDeleteExamType: (examType: ParsedExamType) => void
}

interface TreeNodeRowProps {
  readonly node: AssessmentGroupTreeNode
  readonly depth: number
  readonly editingExamName: string | null
  readonly editDraftValue: string
  readonly isEditDuplicateName: boolean
  readonly deletingExamName: string | null
  readonly updatingExamName: string | null
  readonly isBusy: boolean
  readonly onEditDraftChange: (value: string) => void
  readonly onStartEditExamType: (examType: ParsedExamType) => void
  readonly onCancelEditExamType: () => void
  readonly onSaveEditExamType: () => void
  readonly onRequestDeleteExamType: (examType: ParsedExamType) => void
}

const INDENT_REM = 1.5
const BASE_PADDING_REM = 0.25

const isGroupNode = (node: AssessmentGroupTreeNode): boolean => node.is_group === 1

const TreeNodeRow = ({
  node,
  depth,
  editingExamName,
  editDraftValue,
  isEditDuplicateName,
  deletingExamName,
  updatingExamName,
  isBusy,
  onEditDraftChange,
  onStartEditExamType,
  onCancelEditExamType,
  onSaveEditExamType,
  onRequestDeleteExamType,
}: TreeNodeRowProps): ReactNode => {
  const children = node.children ?? []
  const hasChildren = children.length > 0
  const isGroup = isGroupNode(node)
  const [isExpanded, setIsExpanded] = useState(true)
  const paddingLeft = `${BASE_PADDING_REM + depth * INDENT_REM}rem`
  const examType: ParsedExamType = {
    name: node.name,
    label: node.assessment_group_name,
  }
  const isEditingRow = !isGroup && editingExamName === node.name
  const isUpdatingRow = updatingExamName === node.name

  const handleToggleExpand = (): void => {
    if (!hasChildren) {
      return
    }
    setIsExpanded((previous) => !previous)
  }

  return (
    <li className="flex flex-col">
      <div
        className={cn(
          'flex min-h-8 items-center gap-1 rounded-md py-0.5 pr-2',
          hasChildren && 'hover:bg-muted/50',
          isEditingRow && 'items-start py-1',
        )}
        style={{ paddingLeft }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? `Collapse ${node.assessment_group_name}`
                : `Expand ${node.assessment_group_name}`
            }
            onClick={handleToggleExpand}
          >
            <ChevronRightIcon
              className={cn(
                'size-4 transition-transform duration-150',
                isExpanded && 'rotate-90',
              )}
              aria-hidden
            />
          </Button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}
        {isGroup ? (
          isExpanded && hasChildren ? (
            <FolderOpenIcon
              className="size-4 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden
            />
          ) : (
            <FolderIcon
              className="size-4 shrink-0 text-amber-600 dark:text-amber-500"
              aria-hidden
            />
          )
        ) : (
          <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        {isEditingRow ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Input
              value={editDraftValue}
              aria-label={`Edit exam type ${node.assessment_group_name}`}
              disabled={isUpdatingRow}
              className="h-8"
              onChange={(event) => onEditDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onSaveEditExamType()
                }
                if (event.key === 'Escape') {
                  onCancelEditExamType()
                }
              }}
            />
            {isEditDuplicateName ? (
              <p className="text-xs text-destructive">
                An exam type with this name already exists in this term.
              </p>
            ) : null}
          </div>
        ) : hasChildren ? (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:underline"
            aria-expanded={isExpanded}
            onClick={handleToggleExpand}
          >
            {node.assessment_group_name}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm">
            {node.assessment_group_name}
          </span>
        )}
        {!isGroup ? (
          <div className="flex shrink-0 gap-1">
            {isEditingRow ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2"
                  disabled={isUpdatingRow || isEditDuplicateName || editDraftValue.trim().length === 0}
                  onClick={onSaveEditExamType}
                >
                  {isUpdatingRow ? <Spinner className="size-3" /> : null}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={isUpdatingRow}
                  onClick={onCancelEditExamType}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  disabled={isBusy || editingExamName !== null}
                  aria-label={`Edit ${node.assessment_group_name}`}
                  onClick={() => onStartEditExamType(examType)}
                >
                  <PencilIcon className="size-3" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  disabled={isBusy || editingExamName !== null}
                  aria-label={`Remove ${node.assessment_group_name}`}
                  onClick={() => onRequestDeleteExamType(examType)}
                >
                  {deletingExamName === node.name ? (
                    <Spinner className="size-3" />
                  ) : (
                    <XIcon className="size-3" aria-hidden />
                  )}
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
      {hasChildren && isExpanded ? (
        <ul className="flex flex-col">
          {children.map((child) => (
            <TreeNodeRow
              key={child.name}
              node={child}
              depth={depth + 1}
              editingExamName={editingExamName}
              editDraftValue={editDraftValue}
              isEditDuplicateName={isEditDuplicateName}
              deletingExamName={deletingExamName}
              updatingExamName={updatingExamName}
              isBusy={isBusy}
              onEditDraftChange={onEditDraftChange}
              onStartEditExamType={onStartEditExamType}
              onCancelEditExamType={onCancelEditExamType}
              onSaveEditExamType={onSaveEditExamType}
              onRequestDeleteExamType={onRequestDeleteExamType}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

/**
 * Collapsible file-explorer-style tree of Assessment Groups from the API.
 */
export const AssessmentGroupTreeView = ({
  tree,
  editingExamName,
  editDraftValue,
  isEditDuplicateName,
  deletingExamName,
  updatingExamName,
  isBusy,
  onEditDraftChange,
  onStartEditExamType,
  onCancelEditExamType,
  onSaveEditExamType,
  onRequestDeleteExamType,
}: AssessmentGroupTreeViewProps): ReactNode => {
  if (tree.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No assessment group tree for this academic year.
      </p>
    )
  }
  return (
    <ul className="flex flex-col rounded-lg border bg-muted/20 p-2">
      {tree.map((rootNode) => (
        <TreeNodeRow
          key={rootNode.name}
          node={rootNode}
          depth={0}
          editingExamName={editingExamName}
          editDraftValue={editDraftValue}
          isEditDuplicateName={isEditDuplicateName}
          deletingExamName={deletingExamName}
          updatingExamName={updatingExamName}
          isBusy={isBusy}
          onEditDraftChange={onEditDraftChange}
          onStartEditExamType={onStartEditExamType}
          onCancelEditExamType={onCancelEditExamType}
          onSaveEditExamType={onSaveEditExamType}
          onRequestDeleteExamType={onRequestDeleteExamType}
        />
      ))}
    </ul>
  )
}
