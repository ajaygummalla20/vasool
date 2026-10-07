import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { checkRateLimit } from '@/app/lib/rate-limit'
import { logSecurityEvent } from '@/app/lib/security-logger'

/**
 * DPDP Act 2023 — Section 11: Right to Access Information About Personal Data
 * Generates an export of all personal and financial data stored for the Data Principal.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logSecurityEvent({ type: 'AUTH_UNAUTHORIZED', details: { path: '/api/user/export-data' } })
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    // Rate limit: max 5 data exports per hour per user
    const rateLimit = checkRateLimit(`export_data_${user.id}`, { windowMs: 3600_000, max: 5 })
    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        userId: user.id,
        details: { path: '/api/user/export-data' }
      })
      return NextResponse.json(
        { error: 'Export limit reached. You can request a data export up to 5 times per hour.' },
        { status: 429 }
      )
    }

    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // 2. Fetch Clients
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)

    // 3. Fetch Invoices & Items
    const { data: invoices } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (*)
      `)
      .eq('user_id', user.id)

    // 4. Fetch Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)

    // 5. Fetch Subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)

    const exportPayload = {
      export_metadata: {
        platform: 'Settlr (usesettlr.in)',
        compliance: 'Digital Personal Data Protection (DPDP) Act, 2023 — Section 11',
        data_principal_id: user.id,
        data_principal_email: user.email,
        exported_at: new Date().toISOString(),
        record_counts: {
          clients: clients?.length || 0,
          invoices: invoices?.length || 0,
          expenses: expenses?.length || 0,
        },
      },
      profile: profile || {},
      clients: clients || [],
      invoices: invoices || [],
      expenses: expenses || [],
      subscriptions: subscriptions || [],
    }

    logSecurityEvent({
      type: 'DPDP_DATA_EXPORT',
      userId: user.id,
      details: { recordCounts: exportPayload.export_metadata.record_counts }
    })

    const filename = `settlr-data-export-${new Date().toISOString().split('T')[0]}.json`

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err: any) {
    console.error('[DPDP Export Error]', err)
    return NextResponse.json({ error: 'Failed to generate data export. Please try again.' }, { status: 500 })
  }
}
