import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ClientDetailPage from './ClientDetailPage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailRoute({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth check ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ── Profile ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // ── Client ──
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (clientError || !client) notFound()

  // ── Client's invoices ──
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, amount_due,
      issue_date, due_date, sent_at, paid_at, created_at
    `)
    .eq('client_id', id)
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  // ── Client's reminders ──
  const { data: reminders } = await supabase
    .from('reminders')
    .select(`
      id, channel, status, sent_at, days_overdue,
      invoices ( invoice_number )
    `)
    .eq('user_id', user.id)
    .in('invoice_id', (invoices || []).map(i => i.id))
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(10)

  const userName  = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <ClientDetailPage
      client={client as any}
      invoices={(invoices as any) || []}
      reminders={(reminders as any) || []}
      userName={userName}
      userEmail={userEmail}
      userId={user.id}
    />
  )
}
