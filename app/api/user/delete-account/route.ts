import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logSecurityEvent } from '@/app/lib/security-logger'

/**
 * DPDP Act 2023 — Section 12: Right to Correction and Erasure of Personal Data
 * Purges all personal records, invoices, clients, and profile data for the Data Principal.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      logSecurityEvent({ type: 'AUTH_UNAUTHORIZED', details: { path: '/api/user/delete-account' } })
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { confirmation } = body

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation mismatch. You must send confirmation "DELETE" to erase account.' },
        { status: 400 }
      )
    }

    logSecurityEvent({
      type: 'DPDP_DATA_ERASURE_REQUEST',
      userId: user.id,
      details: { email: user.email }
    })

    const failedTables: string[] = []

    // 1. Delete invoice items first (FK dependency)
    const { data: userInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)

    if (userInvoices && userInvoices.length > 0) {
      const invIds = userInvoices.map(i => i.id)
      const { error: itemsErr } = await supabase.from('invoice_items').delete().in('invoice_id', invIds)
      if (itemsErr) failedTables.push('invoice_items')
    }

    // 2. Delete child tables and related entities with error checking
    const tablesToDelete = [
      'payments',
      'reminders',
      'invoices',
      'clients',
      'expenses',
      'contracts',
      'proposals',
      'recurring_templates',
      'billing_orders',
      'subscriptions',
    ]

    for (const table of tablesToDelete) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id)
      if (error) {
        console.warn(`[Delete Account Error] Table ${table}:`, error.message)
        failedTables.push(table)
      }
    }

    // 3. Delete Profile
    const { error: profErr } = await supabase.from('profiles').delete().eq('id', user.id)
    if (profErr) {
      console.warn('[Delete Account Error] Profile:', profErr.message)
      failedTables.push('profiles')
    }

    // 4. Purge Auth record via Admin Client
    let authUserDeleted = false
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)
        const { error: adminErr } = await adminSupabase.auth.admin.deleteUser(user.id)
        if (adminErr) {
          console.error('[Admin Auth Delete Error]:', adminErr.message)
        } else {
          authUserDeleted = true
        }
      } catch (adminErr: any) {
        console.error('[Admin Auth Delete Exception]:', adminErr)
      }
    } else {
      console.warn('[Delete Account Warning]: SUPABASE_SERVICE_ROLE_KEY absent. Auth user record cannot be purged.')
    }

    // 5. Sign out current session
    await supabase.auth.signOut()

    // 6. Report accurate result to user
    if (failedTables.length > 0 || !authUserDeleted) {
      logSecurityEvent({
        type: 'DPDP_DATA_ERASURE_PARTIAL',
        userId: user.id,
        details: { failedTables, authUserDeleted }
      })

      return NextResponse.json(
        {
          success: false,
          partial: true,
          message: 'Account erasure completed partially. Some records or the authentication record could not be fully deleted. Our Data Protection Officer has been notified.',
          details: { failedTables, authUserDeleted }
        },
        { status: 207 }
      )
    }

    logSecurityEvent({
      type: 'DPDP_DATA_ERASURE_COMPLETE',
      userId: user.id,
      details: { email: user.email }
    })

    return NextResponse.json({
      success: true,
      message: 'Account and all associated personal data successfully erased in accordance with Section 12 of the DPDP Act, 2023.',
    })
  } catch (err: any) {
    console.error('[DPDP Delete Account Error]', err)
    return NextResponse.json({ error: 'Failed to erase account. Please contact grievance@usesettlr.in' }, { status: 500 })
  }
}
