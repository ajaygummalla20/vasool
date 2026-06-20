import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
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

  // ── Metrics ──
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: invoices },
    { data: paidThisMonth },
    { data: reminderCount },
    { data: recentActivity },
  ] = await Promise.all([

    // All active invoices with client name
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, total_amount, amount_due,
        status, due_date, issue_date, created_at,
        clients ( name )
      `)
      .eq('user_id', user.id)
      .not('status', 'in', '("cancelled")')
      .order('created_at', { ascending: false })
      .limit(8),

    // Paid this month
    supabase
      .from('payments')
      .select('amount')
      .eq('user_id', user.id)
      .gte('paid_at', firstOfMonth),

    // Reminders sent this month
    supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'sent')
      .gte('sent_at', firstOfMonth),

    // Recent activity (last 8 reminders)
    supabase
      .from('reminders')
      .select(`
        id, channel, status, sent_at, days_overdue,
        invoices ( invoice_number, clients ( name ) )
      `)
      .eq('user_id', user.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(6),
  ])

  // ── Compute metrics ──
  const totalReceivable = (invoices || [])
    .filter(i => !['paid', 'cancelled'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.amount_due || 0), 0)

  const overdueAmount = (invoices || [])
    .filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.amount_due || 0), 0)

  const collectedThisMonth = (paidThisMonth || [])
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)

  const remindersSent = reminderCount?.length ?? 0

  const userName  = profile?.full_name || user.email?.split('@')[0] || 'there'
  const userEmail = user.email || ''

  // ── Greeting ──
  const hour = now.getHours()
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' : 'Good evening'

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <DashboardClient
      userName={userName}
      userEmail={userEmail}
      greeting={greeting}
      dateStr={dateStr}
      metrics={{
        totalReceivable,
        overdueAmount,
        collectedThisMonth,
        remindersSent,
      }}
      invoices={invoices || []}
      recentActivity={recentActivity || []}
    />
  )
}