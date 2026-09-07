import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planId, cycle = 'monthly' } = body

    if (!['pro', 'agency'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const amountInPaise = PLAN_AMOUNTS[planId]?.[cycle as 'monthly' | 'yearly'] || 49900

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

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
            cycle,
          },
        }),
      })

      if (!orderRes.ok) {
        const errText = await orderRes.text()
        console.error('[Razorpay Order Error]:', errText)
        return NextResponse.json({ error: 'Failed to initialize payment gateway' }, { status: 500 })
      }

      const orderData = await orderRes.json()
      return NextResponse.json({
        orderId: orderData.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId,
        planId,
        cycle,
        isTest: false,
      })
    }

    // Mock order fallback if keys are not in .env.local yet (allows instant UI testing)
    const mockOrderId = `order_test_${Date.now()}`
    return NextResponse.json({
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: keyId || 'rzp_test_mock_settlr',
      planId,
      cycle,
      isTest: true,
    })

  } catch (err: any) {
    console.error('[Create Order Error]', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
