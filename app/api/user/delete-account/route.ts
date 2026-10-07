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

    // 1. Delete invoice items first (FK dependency)
    const { data: userInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', user.id)

    if (userInvoices && userInvoices.length > 0) {
      const invIds = userInvoices.map(i => i.id)
      await supabase.from('invoice_items').delete().in('invoice_id', invIds)
    }

    // 2. Delete user records across tables
    await supabase.from('invoices').delete().eq('user_id', user.id)
    await supabase.from('clients').delete().eq('user_id', user.id)
    await supabase.from('expenses').delete().eq('user_id', user.id)
    await supabase.from('subscriptions').delete().eq('user_id', user.id)
    await supabase.from('profiles').delete().eq('id', user.id)

    // 3. Purge Auth record if service role key is present
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)
        await adminSupabase.auth.admin.deleteUser(user.id)
      } catch (adminErr) {
        console.warn('[Admin user delete fallback warning]:', adminErr)
      }
    }

    // 4. Sign out
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      message: 'Account and associated personal data successfully erased in accordance with Section 12 of the DPDP Act, 2023.',
    })
  } catch (err: any) {
    console.error('[DPDP Delete Account Error]', err)
    return NextResponse.json({ error: 'Failed to erase account. Please contact grievance@usesettlr.in' }, { status: 500 })
  }
}
