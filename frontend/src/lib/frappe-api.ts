/** Standard envelope returned by assessment_exercise API methods. */
export interface FrappeApiEnvelope<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
}

/** Unwrap Frappe SDK response to the API envelope inside message. */
export const unwrapFrappeMessage = <T>(response: unknown): FrappeApiEnvelope<T> | null => {
  if (!response || typeof response !== 'object') {
    return null
  }
  const message = (response as { message?: unknown }).message ?? response
  if (!message || typeof message !== 'object') {
    return null
  }
  const envelope = message as FrappeApiEnvelope<T>
  if (typeof envelope.success !== 'boolean') {
    return null
  }
  return envelope
}

/** Unwrap Frappe SDK response to the data payload, or null on failure. */
export const unwrapFrappeData = <T>(response: unknown): T | null => {
  const envelope = unwrapFrappeMessage<T>(response)
  if (!envelope?.success || envelope.data === undefined) {
    return null
  }
  return envelope.data
}

/** Unwrap Frappe SDK response error string, if any. */
export const unwrapFrappeError = (response: unknown): string | null => {
  const envelope = unwrapFrappeMessage<unknown>(response)
  if (!envelope || envelope.success) {
    return null
  }
  return envelope.error ?? 'Unknown error'
}

/** Returns true when the API envelope reports success. */
export const isFrappeCallSuccessful = (response: unknown): boolean => {
  const envelope = unwrapFrappeMessage<unknown>(response)
  if (!envelope) {
    return true
  }
  return envelope.success
}

/**
 * Extracts a user-facing error message from a Frappe API response or thrown error.
 */
export const getFrappeCallErrorMessage = (errorOrResponse: unknown, fallback: string): string => {
  const envelopeError = unwrapFrappeError(errorOrResponse)
  if (envelopeError) {
    return envelopeError
  }
  if (errorOrResponse instanceof Error && errorOrResponse.message.length > 0) {
    return errorOrResponse.message
  }
  if (typeof errorOrResponse === 'object' && errorOrResponse !== null) {
    const record = errorOrResponse as {
      message?: unknown
      error?: unknown
      response?: { data?: { message?: unknown } }
    }
    if (typeof record.error === 'string' && record.error.length > 0) {
      return record.error
    }
    const responseMessage = record.response?.data?.message
    const nestedEnvelopeError = unwrapFrappeError(
      typeof responseMessage === 'object' ? { message: responseMessage } : { message: responseMessage },
    )
    if (nestedEnvelopeError) {
      return nestedEnvelopeError
    }
    if (typeof record.message === 'string' && record.message.length > 0) {
      return record.message
    }
  }
  return fallback
}
