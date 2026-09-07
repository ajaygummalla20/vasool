import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ContractsPageClient from './ContractsPage'

export default async function ContractsRoute() {
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

  // ── Clients list for dropdown ──
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  // ── Existing Contracts ──
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id, title, client_id,
      extracted_amount, extracted_due_date,
      extracted_payment_terms, extracted_late_fee, extracted_scope,
      ai_analysis, created_at,
      clients ( name )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const userName  = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <ContractsPageClient
      contracts={(contracts as any) || []}
      clients={(clients as any) || []}
      userName={userName}
      userEmail={userEmail}
      userId={user.id}
    />
  )
}
