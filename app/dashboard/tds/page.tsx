import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import TDSPage from './TDSPage'

export default async function TDSRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, pan_number, gst_number')
    .eq('id', user.id)
    .single()

  // Fetch paid & partially paid invoices with client info
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, amount_due, issue_date, paid_at,
      clients ( id, name, company_name, pan_number, email, phone, whatsapp )
    `)
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })

  // Fetch payments
  const { data: payments } = await supabase
    .from('payments')
    .select('id, invoice_id, amount, method, paid_at, created_at')
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false })

  const userName = profile?.business_name || profile?.full_name || user.email?.split('@')[0] || ''

  return (
    <TDSPage
      invoices={(invoices as any) || []}
      payments={(payments as any) || []}
      profile={profile || {}}
      userName={userName}
      userEmail={user.email || ''}
      userId={user.id}
    />
  )
}
