import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
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
  const selectedClient = params.client || params.clientId
  const preselectedClientId = typeof selectedClient === 'string' ? selectedClient : ''
  const invoicePrefix = profile?.invoice_prefix || 'INV'
  const invoiceCounter = profile?.invoice_counter || 1
  const previewInvoiceNumber = `${invoicePrefix}-${String(invoiceCounter).padStart(3, '0')}`

  const initialDocType = (typeof params.type === 'string' && ['tax_invoice', 'proforma', 'credit_note'].includes(params.type))
    ? (params.type as 'tax_invoice' | 'proforma' | 'credit_note')
    : 'tax_invoice'
  const initialOriginalInvRef = typeof params.ref === 'string' ? params.ref : ''

  // ── Duplicate invoice or Recurring Template support ──
  const duplicateId = typeof params.duplicate === 'string' ? params.duplicate : ''
  const templateId = typeof params.template === 'string' ? params.template : ''
  let duplicateData = null

  if (duplicateId) {
    const { data: srcInvoice } = await supabase
      .from('invoices')
      .select('*, invoice_items ( description, quantity, unit, unit_price, sort_order )')
      .eq('id', duplicateId)
      .eq('user_id', user.id)
      .single()
    if (srcInvoice) {
      duplicateData = {
        client_id: srcInvoice.client_id,
        contract_id: srcInvoice.contract_id,
        payment_terms: srcInvoice.payment_terms,
        late_fee_terms: srcInvoice.late_fee_terms,
        notes: srcInvoice.client_notes || srcInvoice.notes,
        cgst_pct: srcInvoice.cgst_pct,
        sgst_pct: srcInvoice.sgst_pct,
        igst_pct: srcInvoice.igst_pct,
        discount_pct: srcInvoice.discount_pct,
        discount_amount: srcInvoice.discount_amount,
        items: (srcInvoice.invoice_items || [])
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
          .map((it: { description: string; quantity: number; unit: string; unit_price: number }) => ({
            description: it.description,
            qty: it.quantity,
            unit: it.unit,
            rate: it.unit_price,
          })),
      }
    }
  } else if (templateId) {
    const { data: tpl } = await supabase
      .from('recurring_templates')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()
    if (tpl) {
      duplicateData = {
        client_id: tpl.client_id,
        contract_id: null,
        payment_terms: tpl.payment_terms || 'Net 15',
        late_fee_terms: null,
        notes: tpl.notes || '',
        cgst_pct: 9,
        sgst_pct: 9,
        igst_pct: 0,
        discount_pct: 0,
        discount_amount: 0,
        items: Array.isArray(tpl.items)
          ? tpl.items.map((it: any) => ({
              description: it.description || 'Retainer Services',
              qty: Number(it.qty || it.quantity || 1),
              unit: it.unit || 'mo',
              rate: Number(it.rate || it.unit_price || 0),
            }))
          : [{ description: tpl.title || tpl.template_name || 'Retainer', qty: 1, unit: 'mo', rate: Number(tpl.amount || 0) }],
      }
    }
  }

  return (
    <CreateInvoicePage
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
      businessName={profile?.business_name || ''}
      senderGst={profile?.gst_number || ''}
      senderAddress={profile?.address || ''}
      previewInvoiceNumber={previewInvoiceNumber}
      preselectedClientId={duplicateData?.client_id || preselectedClientId}
      clients={clients || []}
      contracts={contracts || []}
      userId={user.id}
      duplicateData={duplicateData}
      initialDocType={initialDocType}
      initialOriginalInvRef={initialOriginalInvRef}
    />
  )
}
