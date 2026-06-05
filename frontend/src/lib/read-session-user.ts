/**
 * Reads the Frappe session user from browser cookies.
 */
export const readSessionUserFromCookie = (): string | null => {
  if (typeof document === 'undefined') {
    return null
  }
  const userIdEntry = document.cookie
    .split(';')
    .find((entry) => entry.trim().startsWith('user_id='))
  if (!userIdEntry) {
    return null
  }
  const userId = userIdEntry.split('=')[1]?.trim()
  if (!userId || userId === 'Guest') {
    return null
  }
  return userId
}
