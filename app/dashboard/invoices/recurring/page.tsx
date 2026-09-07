import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import RecurringPage from './RecurringPage'

export default async function RecurringInvoicesRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, invoice_prefix, invoice_counter')
    .eq('id', user.id)
    .single()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name, email, whatsapp')
    .eq('user_id', user.id)
    .order('name')

  let templates: any[] = []
  try {
    const { data } = await supabase
      .from('recurring_templates')
      .select('*, clients ( name, company_name, email )')
      .eq('user_id', user.id)
      .order('next_due', { ascending: true })
    templates = data || []
  } catch {
    templates = []
  }

  return (
    <RecurringPage
      templates={templates}
      clients={clients || []}
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
      userId={user.id}
    />
  )
}
