import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ProposalsPage from './ProposalsPage'

export default async function ProposalsRoute() {
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
    .select('id, name, company_name, email')
    .eq('user_id', user.id)
    .order('name')

  let proposals: any[] = []
  try {
    const { data } = await supabase
      .from('proposals')
      .select('*, clients ( name )')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    proposals = data || []
  } catch { proposals = [] }

  const counter = (profile?.invoice_counter || 1)
  const prefix = profile?.invoice_prefix || 'PROP'
  const nextNumber = `${prefix}-${String(counter).padStart(4, '0')}`

  return (
    <ProposalsPage
      proposals={proposals}
      clients={clients || []}
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
      userId={user.id}
      previewNumber={nextNumber}
    />
  )
}
