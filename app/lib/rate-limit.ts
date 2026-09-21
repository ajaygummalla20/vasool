/**
 * In-Memory Sliding Window Rate Limiter for Next.js API Routes
 * Complies with OWASP A04 (Insecure Design) & Denial of Service controls.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Periodic cleanup of stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetTime <= now) {
        rateLimitMap.delete(key)
      }
    }
  }, 5 * 60 * 1000).unref?.()
}

export interface RateLimitOptions {
  windowMs?: number // Default: 60,000ms (1 minute)
  max?: number      // Default: 30 requests per window
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs || 60_000
  const max = options.max || 30
  const now = Date.now()

  const entry = rateLimitMap.get(identifier)

  if (!entry || entry.resetTime <= now) {
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return {
      allowed: true,
      remaining: max - 1,
      resetTime,
    }
  }

  entry.count++
  const allowed = entry.count <= max
  const remaining = Math.max(0, max - entry.count)

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  }
}
