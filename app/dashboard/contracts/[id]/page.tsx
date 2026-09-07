import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ContractDetailPageClient from './ContractDetailPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContractDetailRoute({ params }: Props) {
  const { id } = await params
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

  // ── Fetch Contract by ID ──
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select(`
      id, title, client_id,
      extracted_amount, extracted_due_date,
      extracted_payment_terms, extracted_late_fee, extracted_scope,
      ai_analysis, created_at,
      clients ( id, name, company_name, email, whatsapp, phone )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (contractError || !contract) {
    notFound()
  }

  // ── Clients List for link dropdown ──
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  const userName = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''
  const businessName = profile?.business_name || 'Settlr Partner'

  return (
    <ContractDetailPageClient
      contract={contract as any}
      clients={clients || []}
      userName={userName}
      userEmail={userEmail}
      businessName={businessName}
    />
  )
}
