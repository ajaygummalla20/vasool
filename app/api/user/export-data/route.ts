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

    // Parallel fetch of all user data entities with error safety
    const [
      { data: profile, error: profErr },
      { data: clients, error: clientErr },
      { data: invoices, error: invErr },
      { data: expenses, error: expErr },
      { data: payments, error: payErr },
      { data: reminders, error: remErr },
      { data: proposals, error: propErr },
      { data: contracts, error: conErr },
      { data: recurringTemplates, error: recErr },
      { data: subscriptions, error: subErr },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('clients').select('*').eq('user_id', user.id),
      supabase.from('invoices').select('*, invoice_items (*)').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('payments').select('*').eq('user_id', user.id),
      supabase.from('reminders').select('*').eq('user_id', user.id),
      supabase.from('proposals').select('*').eq('user_id', user.id),
      supabase.from('contracts').select('*').eq('user_id', user.id),
      supabase.from('recurring_templates').select('*').eq('user_id', user.id),
      supabase.from('subscriptions').select('*').eq('user_id', user.id),
    ])

    const fetchErrors = [
      profErr, clientErr, invErr, expErr, payErr,
      remErr, propErr, conErr, recErr, subErr
    ].filter(Boolean)

    if (fetchErrors.length > 0) {
      console.warn('[DPDP Export Queries Warning]:', fetchErrors.map(e => e?.message))
    }

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
          payments: payments?.length || 0,
          reminders: reminders?.length || 0,
          proposals: proposals?.length || 0,
          contracts: contracts?.length || 0,
          recurring_templates: recurringTemplates?.length || 0,
          subscriptions: subscriptions?.length || 0,
        },
      },
      profile: profile || {},
      clients: clients || [],
      invoices: invoices || [],
      expenses: expenses || [],
      payments: payments || [],
      reminders: reminders || [],
      proposals: proposals || [],
      contracts: contracts || [],
      recurring_templates: recurringTemplates || [],
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
