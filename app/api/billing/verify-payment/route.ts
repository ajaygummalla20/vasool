import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/lib/supabase-server'
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

    const body = await request.json().catch(() => ({}))
    const {
      gateway = 'youpi',
      // YouPI / Unified parameters
      orderId: rawOrderId,
      paymentId: rawPaymentId,
      signature: rawSignature,
      utr: rawUtr,
      // Legacy Razorpay parameters
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      cycle = 'monthly',
      isTest = false,
    } = body

    const orderId = rawOrderId || razorpay_order_id
    const paymentId = rawPaymentId || razorpay_payment_id || rawUtr || (isTest ? `mock_pay_${Date.now()}` : null)
    const signature = rawSignature || razorpay_signature

    // 1. Validate plan and billing cycle
    if (!ALLOWED_PLANS.includes(planId)) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }
    if (!ALLOWED_CYCLES.includes(cycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    const isProduction = process.env.NODE_ENV === 'production'
    const youpiSecret = process.env.YOUPI_WEBHOOK_SECRET
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET

    // 2. Strict Production Guard: Test bypass is forbidden in production
    if (isProduction && isTest) {
      logSecurityEvent({
        type: 'BILLING_TAMPER_ATTEMPT',
        userId: user.id,
        details: { message: 'Client attempted isTest bypass in production environment' }
      })
      return NextResponse.json({ error: 'Test mode is disabled in production' }, { status: 403 })
    }

    // 3. Cryptographic Signature Verification
    if (!isTest || isProduction) {
      const activeSecret = gateway === 'razorpay' ? rzpSecret : (youpiSecret || rzpSecret)

      if (!activeSecret) {
        console.error('[Billing Security Violation]: Gateway secret key is missing. Cannot verify payment.')
        return NextResponse.json(
          { error: 'Payment gateway configuration error. Secret key not configured.' },
          { status: 500 }
        )
      }

      if (!orderId || !paymentId || !signature) {
        return NextResponse.json({ error: 'Missing payment signature parameters' }, { status: 400 })
      }

      // Check signature format (sha256=<hex> or raw hex)
      const cleanIncomingSig = signature.startsWith('sha256=') ? signature.slice(7) : signature

      const generatedSignature = crypto
        .createHmac('sha256', activeSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      const sigBuffer = Buffer.from(cleanIncomingSig, 'utf8')
      const genBuffer = Buffer.from(generatedSignature, 'utf8')
      const isValid = sigBuffer.length === genBuffer.length && crypto.timingSafeEqual(sigBuffer, genBuffer)

      if (!isValid) {
        logSecurityEvent({
          type: 'BILLING_VERIFY_FAILED',
          userId: user.id,
          details: { orderId, paymentId, gateway }
        })
        return NextResponse.json({ error: 'Invalid payment signature verification' }, { status: 400 })
      }
    }

    // 4. Order Reconciliation & Ownership Validation
    if (orderId) {
      const { data: existingOrder } = await supabase
        .from('billing_orders')
        .select('*')
        .eq('order_id', orderId)
        .single()

      if (existingOrder) {
        // Validate user ownership of the order
        if (existingOrder.user_id !== user.id) {
          logSecurityEvent({
            type: 'BILLING_TAMPER_ATTEMPT',
            userId: user.id,
            details: { message: 'Cross-user order fulfillment attempt', order_id: orderId }
          })
          return NextResponse.json({ error: 'Order does not belong to the current user' }, { status: 403 })
        }

        // Validate plan & cycle match
        if (existingOrder.plan_id !== planId || existingOrder.billing_cycle !== cycle) {
          return NextResponse.json({ error: 'Order plan or billing cycle mismatch' }, { status: 400 })
        }

        // Idempotency: If order was already fulfilled with this exact payment ID, return success
        if (existingOrder.status === 'paid' && existingOrder.razorpay_payment_id === paymentId) {
          return NextResponse.json({
            success: true,
            planId,
            cycle,
            amount: existingOrder.amount,
            message: 'Payment already processed and active.'
          })
        }
      }
    }

    // 5. Payment ID Replay Defense
    if (paymentId && (!isTest || isProduction)) {
      const { data: duplicatePayment } = await supabase
        .from('subscriptions')
        .select('id, user_id')
        .eq('razorpay_payment_id', paymentId)
        .single()

      if (duplicatePayment && duplicatePayment.user_id !== user.id) {
        logSecurityEvent({
          type: 'BILLING_TAMPER_ATTEMPT',
          userId: user.id,
          details: { message: 'Duplicate payment ID replay attack detected', paymentId }
        })
        return NextResponse.json({ error: 'Payment reference has already been used' }, { status: 400 })
      }
    }

    // Calculate subscription period
    const now = new Date()
    const daysToAdd = cycle === 'yearly' ? 365 : 30
    const periodEnd = new Date(now.getTime() + daysToAdd * 86400000)

    const amountPaid = planId === 'agency'
      ? (cycle === 'yearly' ? 11999 : 1499)
      : (cycle === 'yearly' ? 3999 : 499)

    // 6. Persist Subscription in Supabase with verified service-role or fallback client
    const dbClient = createAdminClient() || supabase

    const finalPaymentId = paymentId || `pay_youpi_${Date.now()}`

    const { error: subError } = await dbClient
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: planId,
        status: 'active',
        billing_cycle: cycle,
        amount: amountPaid,
        currency: 'INR',
        razorpay_order_id: orderId || null,
        razorpay_payment_id: finalPaymentId,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' })

    if (subError) {
      console.error('[Subscription table upsert error]:', subError.message)
      return NextResponse.json(
        { error: 'Failed to record subscription status. Please contact support.' },
        { status: 500 }
      )
    }

    // 7. Update billing_orders status to paid
    if (orderId) {
      await dbClient
        .from('billing_orders')
        .update({
          status: 'paid',
          razorpay_payment_id: finalPaymentId,
          updated_at: now.toISOString(),
        })
        .eq('order_id', orderId)
    }

    logSecurityEvent({
      type: 'BILLING_VERIFY_SUCCESS',
      userId: user.id,
      details: { planId, cycle, amount: amountPaid, gateway }
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
