import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase-server'
import { logSecurityEvent } from '@/app/lib/security-logger'
import crypto from 'crypto'

/**
 * YouPI-PG Webhook Receiver
 * Handles asynchronous payment verification events fired by YouPI-PG's Observation Mesh.
 * Signature header: x-gateway-signature (HMAC-SHA256 of raw request body)
 */
export async function POST(request: NextRequest) {
  try {
    const signatureHeader =
      request.headers.get('x-gateway-signature') ||
      request.headers.get('X-Gateway-Signature')

    const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    if (!webhookSecret) {
      if (isProduction) {
        console.error('[YouPI Webhook Error]: YOUPI_WEBHOOK_SECRET missing in production')
        return NextResponse.json({ error: 'Webhook secret unconfigured' }, { status: 500 })
      }
      console.warn('[YouPI Webhook Dev]: YOUPI_WEBHOOK_SECRET missing, running in dev-tolerant mode')
    }

    // 1. Capture the raw text body strictly for cryptographic HMAC verification
    const rawBody = await request.text()

    if (webhookSecret && signatureHeader) {
      // Clean signature header (handles sha256=<hex> or raw <hex>)
      const incomingHash = signatureHeader.startsWith('sha256=')
        ? signatureHeader.slice(7).trim()
        : signatureHeader.trim()

      const computedHash = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody, 'utf8')
        .digest('hex')

      const sigBuffer = Buffer.from(incomingHash, 'utf8')
      const compBuffer = Buffer.from(computedHash, 'utf8')

      const isValid =
        sigBuffer.length === compBuffer.length &&
        crypto.timingSafeEqual(sigBuffer, compBuffer)

      if (!isValid) {
        logSecurityEvent({
          type: 'BILLING_VERIFY_FAILED',
          details: { message: 'Invalid YouPI-PG webhook signature', signatureHeader },
        })
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    } else if (isProduction) {
      // In production, reject unsigned webhooks
      return NextResponse.json({ error: 'Missing webhook signature header' }, { status: 401 })
    }

    // 2. Parse verified payload
    let payload: any = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // YouPI events: status could be 'RECONCILED', 'SUCCESS', or event 'payment.verified'
    const status = (payload.status || payload.event || '').toUpperCase()
    const orderId = payload.order_id || payload.orderId || payload.orderID || payload.receipt
    const paymentId = payload.payment_id || payload.paymentId || payload.utr || `youpi_${Date.now()}`
    const utr = payload.utr || payload.bank_reference || null

    // We only fulfill on verified / reconciled events
    const isSuccessfulPayment =
      status === 'RECONCILED' ||
      status === 'SUCCESS' ||
      status === 'PAYMENT.VERIFIED' ||
      status === 'PAID'

    if (!isSuccessfulPayment) {
      // Acknowledged, but not yet reconciled (e.g. OBSERVED_SUCCESS or PENDING)
      return NextResponse.json({ received: true, status: 'acknowledged_pending' }, { status: 200 })
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id in webhook payload' }, { status: 400 })
    }

    // 3. Reconcile with billing_orders in database
    const dbClient = createAdminClient()
    if (!dbClient) {
      console.error('[YouPI Webhook]: Admin client unavailable')
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 })
    }

    const { data: order, error: orderErr } = await dbClient
      .from('billing_orders')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (orderErr || !order) {
      console.warn('[YouPI Webhook]: Order not found for reconciliation:', orderId)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Idempotency: if already paid, return early
    if (order.status === 'paid') {
      return NextResponse.json({ received: true, message: 'Order already fulfilled' }, { status: 200 })
    }

    // 4. Calculate subscription period
    const now = new Date()
    const daysToAdd = order.billing_cycle === 'yearly' ? 365 : 30
    const periodEnd = new Date(now.getTime() + daysToAdd * 86400000)

    // 5. Upsert subscription
    const { error: subError } = await dbClient
      .from('subscriptions')
      .upsert(
        {
          user_id: order.user_id,
          plan_id: order.plan_id,
          status: 'active',
          billing_cycle: order.billing_cycle,
          amount: order.amount,
          currency: order.currency || 'INR',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (subError) {
      console.error('[YouPI Webhook]: Subscription upsert failed:', subError.message)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    // 6. Mark billing order as paid
    await dbClient
      .from('billing_orders')
      .update({
        status: 'paid',
        razorpay_payment_id: paymentId,
        updated_at: now.toISOString(),
      })
      .eq('order_id', orderId)

    logSecurityEvent({
      type: 'BILLING_VERIFY_SUCCESS',
      userId: order.user_id,
      details: {
        gateway: 'YouPI-PG',
        orderId,
        paymentId,
        utr,
        planId: order.plan_id,
        amount: order.amount,
      },
    })

    return NextResponse.json({
      received: true,
      success: true,
      orderId,
      status: 'fulfilled',
    })
  } catch (err: any) {
    console.error('[YouPI Webhook Exception]:', err)
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 })
  }
}
