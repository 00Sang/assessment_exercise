import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useFrappeAuth } from 'frappe-react-sdk'
import { useState, type FormEvent } from 'react'

export interface LoginDialogProps {
  readonly open: boolean
  readonly onLoginSuccess?: () => void
}

/**
 * Modal login form backed by the Frappe session API.
 */
const getLoginErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  return 'Login failed. Check your credentials.'
}

export function LoginDialog({ open, onLoginSuccess }: LoginDialogProps) {
  const { login, getUserCookie, updateCurrentUser } = useFrappeAuth()
  const [username, setUsername] = useState<string>('Administrator')
  const [password, setPassword] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const trimmedUsername = username.trim()
    if (trimmedUsername.length === 0 || password.length === 0) {
      setErrorMessage('Enter both username and password.')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await login({ username: trimmedUsername, password })
      getUserCookie()
      onLoginSuccess?.()
      void updateCurrentUser()
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Use your Frappe credentials to access the assessment scheme builder.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>Login failed</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="login-username">Username</FieldLabel>
              <Input
                id="login-username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner className="size-4" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
