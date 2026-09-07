import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import GstPageClient from './GstPage'

export default async function GstRoute() {
  const supabase = await createClient()

  // ── Auth check ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ── Profile ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, gstin, address, phone')
    .eq('id', user.id)
    .single()

  // ── Fetch all Invoices with items & clients for GST calculation ──
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, subtotal, tax_rate, tax_amount,
      discount_amount, issue_date, due_date, notes, created_at,
      invoice_items ( id, description, quantity, unit_price, amount, hsn_sac ),
      clients ( id, name, company_name, gstin, state, email, whatsapp, phone )
    `)
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })

  const userName = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <GstPageClient
      invoices={(invoices as any) || []}
      profile={profile || { full_name: userName, business_name: 'Settlr Partner', gstin: null, address: null, phone: null }}
      userName={userName}
      userEmail={userEmail}
    />
  )
}
