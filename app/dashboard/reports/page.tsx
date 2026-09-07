import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ReportsPage from './ReportsPage'

export default async function ReportsRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount, amount_due, issue_date, due_date, paid_at, clients ( name )')
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, method, paid_at')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })

  let expenses: any[] = []
  try {
    const { data } = await supabase
      .from('expenses')
      .select('id, amount, category, expense_date, gst_amount')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })
    expenses = data || []
  } catch { expenses = [] }

  return (
    <ReportsPage
      invoices={(invoices as any) || []}
      payments={payments || []}
      expenses={expenses}
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
    />
  )
}
