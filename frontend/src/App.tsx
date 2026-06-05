import { AuthGate } from '@/components/auth/auth-gate'
import { AppShell } from '@/components/layout/app-shell'
import { AssessmentTabs } from '@/components/assessment-tabs/assessment-tabs'

function App() {
  return (
    <AuthGate>
      <AppShell>
        <AssessmentTabs />
      </AppShell>
    </AuthGate>
  )
}

export default App
