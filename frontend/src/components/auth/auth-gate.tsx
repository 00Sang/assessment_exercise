import { LoginDialog } from '@/components/auth/login-dialog'
import { Spinner } from '@/components/ui/spinner'
import { readSessionUserFromCookie } from '@/lib/read-session-user'
import { useFrappeAuth } from 'frappe-react-sdk'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

export interface AuthGateProps {
  readonly children: ReactNode
}

/**
 * Blocks the app until the user has an active Frappe session.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { currentUser, isLoading, getUserCookie, updateCurrentUser } = useFrappeAuth()
  const [sessionUser, setSessionUser] = useState<string | null>(() => readSessionUserFromCookie())
  const syncSessionUser = useCallback((): void => {
    getUserCookie()
    setSessionUser(readSessionUserFromCookie())
  }, [getUserCookie])
  useEffect(() => {
    syncSessionUser()
  }, [syncSessionUser])
  const handleLoginSuccess = useCallback((): void => {
    syncSessionUser()
    void updateCurrentUser()
  }, [syncSessionUser, updateCurrentUser])
  const activeUser = currentUser ?? sessionUser
  const isAuthenticated = Boolean(activeUser)
  const isCheckingSession = isLoading && !isAuthenticated
  if (isCheckingSession) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }
  return (
    <>
      {!isAuthenticated && <LoginDialog open onLoginSuccess={handleLoginSuccess} />}
      {isAuthenticated ? children : null}
    </>
  )
}
