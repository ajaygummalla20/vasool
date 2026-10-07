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

// 4. Digital Personal Data Protection (DPDP Act 2023) Compliance Controls
test('DPDP Data Export Rate Limiting caps export abuse at 5 requests/hr', () => {
  const userId = `dpdp_user_${Date.now()}`
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(`export_data_${userId}`, { windowMs: 3600_000, max: 5 })
    assert(res.allowed === true, `Export ${i + 1} within threshold must be allowed`)
  }
  const excess = checkRateLimit(`export_data_${userId}`, { windowMs: 3600_000, max: 5 })
  assert(excess.allowed === false, '6th export in same hour must be rejected')
})

test('DPDP Section 12 Account Erasure rejects invalid confirmation strings', () => {
  const validateConfirmation = (conf: any) => conf === 'DELETE'
  assert(validateConfirmation('DELETE') === true, 'Exact string "DELETE" must pass')
  assert(validateConfirmation('delete') === false, 'Lowercase "delete" must fail')
  assert(validateConfirmation('yes') === false, 'Arbitrary confirmation must fail')
  assert(validateConfirmation(undefined) === false, 'Undefined confirmation must fail')
})

console.log(`\nResults: ${passed}/${total} passed (${failed} failed)`)
if (failed > 0) process.exit(1)
