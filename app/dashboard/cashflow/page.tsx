import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import CashflowPage from './CashflowPage'

export default async function CashflowRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()

  // Fetch all invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, amount_due, issue_date, due_date, paid_at,
      clients ( id, name, company_name )
    `)
    .eq('user_id', user.id)
    .order('due_date', { ascending: true })

  // Fetch recurring templates
  let recurring: any[] = []
  try {
    const { data } = await supabase
      .from('recurring_templates')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
    recurring = data || []
  } catch {
    recurring = []
  }

  // Fetch expenses
  let expenses: any[] = []
  try {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })
    expenses = data || []
  } catch {
    expenses = []
  }

  const userName = profile?.business_name || profile?.full_name || user.email?.split('@')[0] || ''

  return (
    <CashflowPage
      invoices={(invoices as any) || []}
      recurring={recurring}
      expenses={expenses}
      userName={userName}
      userEmail={user.email || ''}
      userId={user.id}
    />
  )
}
