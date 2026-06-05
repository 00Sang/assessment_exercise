import { AssessmentCriteriaPage } from '@/pages/assessment-criteria-page'
import { AssessmentGroupPage } from '@/pages/assessment-group-page'
import { PlanFormPage } from '@/pages/plan-form-page'
import { TermSchemePage } from '@/pages/term-scheme-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClipboardList, FolderTree, GitBranch, ListChecks } from 'lucide-react'

/**
 * Renders the assessment builder tabs and each tab's page content.
 */
export const AssessmentTabs = () => {
  return (
    <Tabs defaultValue="criteria" className="w-full">
      <TabsList className="grid !h-auto w-full grid-cols-1 gap-0 overflow-hidden rounded-none border bg-transparent p-0 md:grid-cols-2 lg:grid-cols-4">
        <TabsTrigger
          value="criteria"
          className="group relative !inline-flex h-full min-h-16 !flex-col !items-start !justify-start gap-1 rounded-none border-b px-4 py-2.5 !whitespace-normal text-left !text-zinc-700 transition-all data-[state=active]:bg-primary data-[state=active]:!text-white md:border-r md:border-b-0"
        >
          <span className="font-mono text-xs opacity-60 group-data-[state=active]:opacity-100">
            01
          </span>
          <div className="flex w-full items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <span className="block text-sm font-bold tracking-tight uppercase sm:text-base">
              Assessment Criteria
            </span>
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="group"
          className="group relative !inline-flex h-full min-h-16 !flex-col !items-start !justify-start gap-1 rounded-none border-b px-4 py-2.5 !whitespace-normal text-left !text-zinc-700 transition-all data-[state=active]:bg-primary data-[state=active]:!text-white md:border-r md:border-b-0"
        >
          <span className="font-mono text-xs opacity-60 group-data-[state=active]:opacity-100">
            02
          </span>
          <div className="flex w-full items-center gap-2">
            <FolderTree className="h-5 w-5" />
            <span className="block text-sm font-bold tracking-tight uppercase sm:text-base">
              Assessment Group
            </span>
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="plan"
          className="group relative !inline-flex h-full min-h-16 !flex-col !items-start !justify-start gap-1 rounded-none border-b px-4 py-2.5 !whitespace-normal text-left !text-zinc-700 transition-all data-[state=active]:bg-primary data-[state=active]:!text-white md:border-r md:border-b-0 lg:border-b-0"
        >
          <span className="font-mono text-xs opacity-60 group-data-[state=active]:opacity-100">
            03
          </span>
          <div className="flex w-full items-center gap-2">
            <ListChecks className="h-5 w-5" />
            <span className="block text-sm font-bold tracking-tight uppercase sm:text-base">
              Assessment Plan
            </span>
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="scheme"
          className="group relative !inline-flex h-full min-h-16 !flex-col !items-start !justify-start gap-1 rounded-none border-b px-4 py-2.5 !whitespace-normal text-left !text-zinc-700 transition-all data-[state=active]:bg-primary data-[state=active]:!text-white md:border-b-0 lg:border-b-0"
        >
          <span className="font-mono text-xs opacity-60 group-data-[state=active]:opacity-100">
            04
          </span>
          <div className="flex w-full items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <span className="block text-sm font-bold tracking-tight uppercase sm:text-base">
              Term Scheme
            </span>
          </div>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="criteria" className="mt-4">
        <AssessmentCriteriaPage />
      </TabsContent>
      <TabsContent value="group" className="mt-4">
        <AssessmentGroupPage />
      </TabsContent>
      <TabsContent value="plan" className="mt-4">
        <PlanFormPage />
      </TabsContent>
      <TabsContent value="scheme" className="mt-4">
        <TermSchemePage />
      </TabsContent>
    </Tabs>
  )
}
