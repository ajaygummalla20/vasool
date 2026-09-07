import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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

    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // If real keys are present and not in mock mode, verify cryptographic signature
    if (keySecret && !isTest) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (generatedSignature !== razorpay_signature) {
        return NextResponse.json({ error: 'Invalid payment signature verification' }, { status: 400 })
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
