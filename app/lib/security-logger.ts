/**
 * Structured Security & Audit Logger for Settlr
 * Enforces audit trails for sensitive financial & auth actions without leaking secrets or PII.
 */

export type SecurityEventType =
  | 'AUTH_LOGIN'
  | 'AUTH_UNAUTHORIZED'
  | 'BILLING_VERIFY_SUCCESS'
  | 'BILLING_VERIFY_FAILED'
  | 'BILLING_TAMPER_ATTEMPT'
  | 'AI_CONTRACT_ANALYZE'
  | 'AI_EXPENSE_SCAN'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVOICE_PUBLIC_ACCESS'

export interface SecurityEventPayload {
  type: SecurityEventType
  userId?: string | null
  ip?: string | null
  details?: Record<string, any>
  timestamp?: string
}

export function logSecurityEvent(event: SecurityEventPayload) {
  const timestamp = event.timestamp || new Date().toISOString()

  // Ensure sensitive data is never logged (passwords, HMAC secrets, tokens)
  const sanitizedDetails = { ...event.details }
  delete sanitizedDetails.password
  delete sanitizedDetails.secret
  delete sanitizedDetails.keySecret
  delete sanitizedDetails.razorpay_signature
  delete sanitizedDetails.token

  const logLine = JSON.stringify({
    timestamp,
    service: 'settlr-security',
    eventType: event.type,
    userId: event.userId || 'anonymous',
    ip: event.ip || 'unknown',
    details: sanitizedDetails,
  })

  if (
    event.type === 'BILLING_TAMPER_ATTEMPT' ||
    event.type === 'BILLING_VERIFY_FAILED' ||
    event.type === 'RATE_LIMIT_EXCEEDED'
  ) {
    console.warn(`[SECURITY ALERT] ${logLine}`)
  } else {
    console.info(`[SECURITY AUDIT] ${logLine}`)
  }
}
