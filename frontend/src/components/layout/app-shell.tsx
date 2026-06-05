import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useFrappeAuth } from 'frappe-react-sdk'

export interface AppShellProps {
  readonly title?: string
  readonly children: ReactNode
}

export function AppShell({
  title = 'Assessment Scheme Builder',
  children,
}: AppShellProps) {
  const { currentUser, logout } = useFrappeAuth()
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false)
  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="flex w-full flex-col gap-2 px-6 py-4 md:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            <Badge variant="secondary">CBSE VI–VIII</Badge>
            <Badge variant="outline">Prototype</Badge>
            <div className="ml-auto flex items-center gap-2">
              {currentUser && (
                <Badge variant="secondary">{currentUser}</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Spinner className="size-3.5" />
                    Signing out…
                  </>
                ) : (
                  'Sign out'
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure assessment groups, criteria, and plans for the academic year.
          </p>
        </div>
      </header>
      <main className="flex w-full flex-1 flex-col gap-6 px-6 py-6 md:px-8">
        {children}
      </main>
      <footer className="mt-auto border-t border-border">
        <div className="w-full px-6 py-3 text-xs text-muted-foreground md:px-8">
          Assessment Scheme Builder — take-home exercise
        </div>
      </footer>
    </div>
  )
}
