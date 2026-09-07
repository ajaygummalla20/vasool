import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ScheduledRemindersClient from './ScheduledRemindersPage'

export default async function ScheduledRemindersRoute() {
  const supabase = await createClient()

  // ── Auth check ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ── Profile ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()

  // ── Fetch scheduled (upcoming) reminders with invoice & client joins ──
  const { data: reminders } = await supabase
    .from('reminders')
    .select(`
      id, invoice_id, channel, status, scheduled_at, sent_at, days_overdue, used_contract_context,
      invoices (
        id, invoice_number, total_amount, amount_due, due_date, status,
        clients ( id, name, company_name, whatsapp, phone )
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })

  const userName  = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <ScheduledRemindersClient
      reminders={(reminders as any) || []}
      userName={userName}
      userEmail={userEmail}
      businessName={profile?.business_name || 'Settlr Partner'}
    />
  )
}
