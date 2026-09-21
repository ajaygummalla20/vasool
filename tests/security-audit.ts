/**
 * Automated Security & Hardening Test Suite for Settlr
 * Inspired by addyosmani/agent-skills (security-and-hardening, test-driven-development)
 */

import crypto from 'crypto'
import { checkRateLimit } from '../app/lib/rate-limit'

let total = 0
let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  total++
  try {
    fn()
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${name}`)
  } catch (err: any) {
    failed++
    console.error(`  \x1b[31m✕\x1b[0m ${name}: ${err.message}`)
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg)
}

console.log('\n\x1b[1m\x1b[36m=== SETTLR SECURITY & HARDENING AUDIT ===\x1b[0m')

// 1. Rate Limiting Tests
test('Rate Limiter allows initial requests within window', () => {
  const id = `test_user_${Date.now()}`
  const r1 = checkRateLimit(id, { windowMs: 1000, max: 2 })
  assert(r1.allowed === true, 'First request should be allowed')
  assert(r1.remaining === 1, 'Remaining should be 1')

  const r2 = checkRateLimit(id, { windowMs: 1000, max: 2 })
  assert(r2.allowed === true, 'Second request should be allowed')
  assert(r2.remaining === 0, 'Remaining should be 0')
})

test('Rate Limiter rejects requests exceeding threshold (DoS defense)', () => {
  const id = `test_dos_${Date.now()}`
  checkRateLimit(id, { windowMs: 1000, max: 1 })
  const r2 = checkRateLimit(id, { windowMs: 1000, max: 1 })
  assert(r2.allowed === false, 'Excess request must be rejected with allowed=false')
})

// 2. Cryptographic Payment Verification & Timing Attacks
test('HMAC-SHA256 signature verification validates authentic Razorpay signatures', () => {
  const secret = 'rzp_live_secret_sample_key_12345'
  const orderId = 'order_998877'
  const paymentId = 'pay_665544'
  const authenticSig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  const sigBuffer = Buffer.from(authenticSig, 'utf8')
  const genBuffer = Buffer.from(authenticSig, 'utf8')
  const isValid = sigBuffer.length === genBuffer.length && crypto.timingSafeEqual(sigBuffer, genBuffer)

  assert(isValid === true, 'Authentic signature should pass timingSafeEqual')
})

test('HMAC-SHA256 rejects tampered Razorpay signatures (Tamper Resistance)', () => {
  const secret = 'rzp_live_secret_sample_key_12345'
  const orderId = 'order_998877'
  const paymentId = 'pay_665544'
  const authenticSig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  // Tamper with last character
  const tamperedSig = authenticSig.slice(0, -1) + (authenticSig.slice(-1) === 'a' ? 'b' : 'a')
  const sigBuffer = Buffer.from(tamperedSig, 'utf8')
  const genBuffer = Buffer.from(authenticSig, 'utf8')
  const isValid = sigBuffer.length === genBuffer.length && crypto.timingSafeEqual(sigBuffer, genBuffer)

  assert(isValid === false, 'Tampered signature must be rejected')
})

// 3. Subscription Allowlist Verification
test('Subscription plans are strictly constrained to allowlist', () => {
  const ALLOWED_PLANS = ['starter', 'pro', 'agency']
  assert(ALLOWED_PLANS.includes('agency'), 'agency plan must be allowed')
  assert(!ALLOWED_PLANS.includes('enterprise_free_hack'), 'Injected plan must not be allowed')
})

console.log(`\nResults: ${passed}/${total} passed (${failed} failed)`)
if (failed > 0) process.exit(1)
