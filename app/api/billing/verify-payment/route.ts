import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { logSecurityEvent } from '@/app/lib/security-logger'
import crypto from 'crypto'

const ALLOWED_PLANS = ['starter', 'pro', 'agency']
const ALLOWED_CYCLES = ['monthly', 'yearly']

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logSecurityEvent({ type: 'AUTH_UNAUTHORIZED', details: { path: '/api/billing/verify-payment' } })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      cycle = 'monthly',
      isTest = false,
    } = body

    // 1. Validate plan and billing cycle
    if (!ALLOWED_PLANS.includes(planId)) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }
    if (!ALLOWED_CYCLES.includes(cycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // In production, isTest from client is STRICTLY rejected if keys are present
    if (keySecret) {
      if (isProduction && isTest) {
        logSecurityEvent({
          type: 'BILLING_TAMPER_ATTEMPT',
          userId: user.id,
          details: { message: 'Client attempted isTest bypass in production environment' }
        })
        return NextResponse.json({ error: 'Test mode is disabled in production' }, { status: 403 })
      }

      // If not explicit local dev mock, verify signature
      if (!isTest || isProduction) {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return NextResponse.json({ error: 'Missing payment signature parameters' }, { status: 400 })
        }

        const generatedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest('hex')

        // Constant-time comparison to prevent timing attacks
        const sigBuffer = Buffer.from(razorpay_signature, 'utf8')
        const genBuffer = Buffer.from(generatedSignature, 'utf8')
        const isValid = sigBuffer.length === genBuffer.length && crypto.timingSafeEqual(sigBuffer, genBuffer)

        if (!isValid) {
          logSecurityEvent({
            type: 'BILLING_VERIFY_FAILED',
            userId: user.id,
            details: { razorpay_order_id, razorpay_payment_id }
          })
          return NextResponse.json({ error: 'Invalid payment signature verification' }, { status: 400 })
        }
      }
    }

    // Calculate subscription period
    const now = new Date()
    const daysToAdd = cycle === 'yearly' ? 365 : 30
    const periodEnd = new Date(now.getTime() + daysToAdd * 86400000)

    const amountPaid = planId === 'agency'
      ? (cycle === 'yearly' ? 11999 : 1499)
      : (cycle === 'yearly' ? 3999 : 499)

    // Upsert subscription in Supabase
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          billing_cycle: cycle,
          amount: amountPaid,
          currency: 'INR',
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id: razorpay_payment_id || `pay_mock_${Date.now()}`,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        console.warn('[Subscription table upsert warning]:', error.message)
      }
    } catch (e) {
      console.warn('[Subscription table catch]:', e)
    }

    logSecurityEvent({
      type: 'BILLING_VERIFY_SUCCESS',
      userId: user.id,
      details: { planId, cycle, amount: amountPaid }
    })

    return NextResponse.json({
      success: true,
      planId,
      cycle,
      expiresAt: periodEnd.toISOString(),
      amount: amountPaid,
    })

  } catch (err: any) {
    console.error('[Verify Payment Error]', err)
    return NextResponse.json({ error: err.message || 'Verification failed' }, { status: 500 })
  }
}
