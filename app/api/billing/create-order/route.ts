import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { logSecurityEvent } from '@/app/lib/security-logger'

// Plan pricing in paise (1 INR = 100 paise)
const PLAN_AMOUNTS: Record<string, { monthly: number; yearly: number }> = {
  pro: {
    monthly: 49900,  // ₹499
    yearly: 399900,  // ₹3,999 (~33% discount)
  },
  agency: {
    monthly: 149900, // ₹1,499
    yearly: 1199900, // ₹11,999 (~33% discount)
  },
}

const ALLOWED_CYCLES = ['monthly', 'yearly'] as const
type BillingCycle = (typeof ALLOWED_CYCLES)[number]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logSecurityEvent({ type: 'AUTH_UNAUTHORIZED', details: { path: '/api/billing/create-order' } })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { planId, cycle } = body

    if (!['pro', 'agency'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan selected. Expected "pro" or "agency".' }, { status: 400 })
    }

    // Strict validation of cycle: do not silently fall back to default
    if (!cycle || !ALLOWED_CYCLES.includes(cycle as BillingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle. Expected "monthly" or "yearly".' }, { status: 400 })
    }

    const validCycle = cycle as BillingCycle
    const amountInPaise = PLAN_AMOUNTS[planId][validCycle]

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    let orderId: string
    let isTest = false

    // If Razorpay API keys are configured, create real order via Razorpay REST API
    if (keyId && keySecret) {
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: {
            userId: user.id,
            planId,
            cycle: validCycle,
          },
        }),
      })

      if (!orderRes.ok) {
        const errText = await orderRes.text()
        console.error('[Razorpay Order Error]:', errText)
        return NextResponse.json({ error: 'Failed to initialize payment gateway' }, { status: 500 })
      }

      const orderData = await orderRes.json()
      orderId = orderData.id
    } else {
      // In production, missing payment credentials must fail closed
      if (isProduction) {
        console.error('[Billing Configuration Error]: Razorpay keys missing in production')
        return NextResponse.json(
          { error: 'Payment gateway is temporarily unavailable. Please contact support.' },
          { status: 500 }
        )
      }

      // Dev-only mock order
      orderId = `order_test_${Date.now()}`
      isTest = true
    }

    // Persist pending order to bind user, plan, cycle and amount for reconciliation
    const { error: orderInsertError } = await supabase
      .from('billing_orders')
      .insert({
        user_id: user.id,
        order_id: orderId,
        plan_id: planId,
        billing_cycle: validCycle,
        amount: amountInPaise / 100,
        currency: 'INR',
        status: 'created',
      })

    if (orderInsertError) {
      console.warn('[Billing Order Insert Warning]:', orderInsertError.message)
    }

    return NextResponse.json({
      orderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: keyId || (isTest ? 'rzp_test_mock_settlr' : ''),
      planId,
      cycle: validCycle,
      isTest,
    })

  } catch (err: any) {
    console.error('[Create Order Error]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
