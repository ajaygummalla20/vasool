import { redirect } from 'next/navigation'
import { createClient } from '../settings/supabase-server'
import InvoicesListPage from './InvoicesListPage'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, amount_due,
      issue_date, due_date, sent_at, paid_at, created_at,
      clients ( id, name, company_name, whatsapp, phone )
    `)
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  return (
    <InvoicesListPage
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
      userId={user.id}
      initialInvoices={invoices || []}
    />
  )
}
