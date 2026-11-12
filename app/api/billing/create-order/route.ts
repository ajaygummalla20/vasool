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
    const amountInRupees = amountInPaise / 100

    const isProduction = process.env.NODE_ENV === 'production'
    const origin = request.nextUrl.origin
    const merchantUpi = process.env.NEXT_PUBLIC_MERCHANT_UPI_ID || process.env.MERCHANT_UPI_ID || 'settlr@upi'
    const merchantName = process.env.MERCHANT_NAME || 'Settlr Technologies'

    // Check YouPI-PG Gateway configuration
    const youpiApiUrl = process.env.YOUPI_API_URL
    const youpiCheckoutUrl = process.env.NEXT_PUBLIC_YOUPI_CHECKOUT_URL || 'http://localhost:7000'
    const youpiMerchantId = process.env.YOUPI_MERCHANT_ID
    const youpiApiKey = process.env.YOUPI_MERCHANT_API_KEY

    // Legacy Razorpay Gateway credentials (for fallback)
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET

    let orderId = `order_${user.id.slice(0, 6)}_${Date.now()}`
    let checkoutUrl = ''
    let isTest = false
    let gateway: 'native_upi' | 'youpi' | 'razorpay' | 'simulator' = 'native_upi'

    // 1. Try YouPI-PG Gateway if explicitly configured and active
    if (youpiApiUrl && youpiMerchantId) {
      gateway = 'youpi'
      try {
        const youpiRes = await fetch(`${youpiApiUrl}/api/v1/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-merchant-id': youpiMerchantId,
            ...(youpiApiKey ? { 'x-api-key': youpiApiKey } : {}),
            'Idempotency-Key': `idem_${user.id}_${Date.now()}`,
          },
          body: JSON.stringify({
            orderId,
            amount: amountInRupees,
            currency: 'INR',
            customerName: user.user_metadata?.full_name || 'Settlr Customer',
            customerEmail: user.email,
            returnUrl: `${origin}/dashboard/billing?status=return&orderId=${orderId}`,
            metadata: {
              userId: user.id,
              planId,
              cycle: validCycle,
            },
          }),
        })

        if (youpiRes.ok) {
          const youpiData = await youpiRes.json().catch(() => ({}))
          orderId = youpiData.orderId || youpiData.paymentId || orderId
          checkoutUrl = youpiData.checkoutUrl || `${youpiCheckoutUrl}/pay/${orderId}`
        } else {
          // If YouPI service returned error, fall back gracefully to native zero-fee UPI
          gateway = 'native_upi'
        }
      } catch {
        // If YouPI offline, fall back to native zero-fee UPI
        gateway = 'native_upi'
      }
    } else if (razorpayKeyId && razorpayKeySecret) {
      // 2. Legacy Razorpay Fallback if explicitly configured
      gateway = 'razorpay'
      const authHeader = 'Basic ' + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')
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

      if (orderRes.ok) {
        const orderData = await orderRes.json()
        orderId = orderData.id
      } else {
        gateway = 'native_upi'
      }
    } else {
      // 3. Default Native 0% Fee UPI Gateway
      gateway = 'native_upi'
    }

    // Persist pending order in Supabase
    const { error: orderInsertError } = await supabase
      .from('billing_orders')
      .insert({
        user_id: user.id,
        order_id: orderId,
        plan_id: planId,
        billing_cycle: validCycle,
        amount: amountInRupees,
        currency: 'INR',
        status: 'created',
      })

    if (orderInsertError) {
      console.warn('[Billing Order Insert Warning]:', orderInsertError.message)
    }

    return NextResponse.json({
      orderId,
      amount: amountInPaise,
      amountInRupees,
      currency: 'INR',
      gateway,
      merchantUpi,
      merchantName,
      checkoutUrl,
      youpiCheckoutUrl,
      youpiMerchantId: youpiMerchantId || 'settlr_merchant_dev',
      keyId: razorpayKeyId || '',
      planId,
      cycle: validCycle,
      isTest,
    })

  } catch (err: any) {
    console.error('[Create Order Error]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
