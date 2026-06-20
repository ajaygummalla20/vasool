import { redirect } from 'next/navigation'
import { createClient } from '../../settings/supabase-server'
import CreateInvoicePage from './CreateInvoicePage'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, gst_number, address, invoice_prefix, invoice_counter')
    .eq('id', user.id)
    .single()

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, name, company_name, email, whatsapp, phone,
      gst_number, city, state
    `)
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id, title, client_id, extracted_amount, extracted_due_date,
      extracted_payment_terms, extracted_late_fee, extracted_scope
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const params = await searchParams
  const selectedClient = params.client
  const preselectedClientId = typeof selectedClient === 'string' ? selectedClient : ''
  const invoicePrefix = profile?.invoice_prefix || 'INV'
  const invoiceCounter = profile?.invoice_counter || 1
  const previewInvoiceNumber = `${invoicePrefix}-${String(invoiceCounter).padStart(3, '0')}`

  return (
    <CreateInvoicePage
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
      businessName={profile?.business_name || ''}
      senderGst={profile?.gst_number || ''}
      senderAddress={profile?.address || ''}
      previewInvoiceNumber={previewInvoiceNumber}
      preselectedClientId={preselectedClientId}
      clients={clients || []}
      contracts={contracts || []}
      userId={user.id}
    />
  )
}
