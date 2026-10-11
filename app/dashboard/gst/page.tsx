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
    .select('full_name, business_name, gst_number, address, phone')
    .eq('id', user.id)
    .single()

  // ── Fetch all Invoices with items & clients for GST calculation ──
  const { data: rawInvoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, subtotal, taxable_amount,
      cgst_pct, sgst_pct, igst_pct, cgst_amount, sgst_amount, igst_amount,
      discount_amount, issue_date, due_date, notes, created_at,
      invoice_items ( id, description, quantity, unit_price, gst_rate, hsn_sac ),
      clients ( id, name, company_name, gst_number, state, email, whatsapp, phone )
    `)
    .eq('user_id', user.id)
    .order('issue_date', { ascending: false })

  const invoices = (rawInvoices || []).map((inv: any) => {
    const cgstAmt = Number(inv.cgst_amount || 0)
    const sgstAmt = Number(inv.sgst_amount || 0)
    const igstAmt = Number(inv.igst_amount || 0)
    const computedTax = cgstAmt + sgstAmt + igstAmt

    const total = Number(inv.total_amount || 0)
    const subtotal = Number(inv.subtotal || inv.taxable_amount || (total - computedTax))

    const cgstPct = Number(inv.cgst_pct || 0)
    const sgstPct = Number(inv.sgst_pct || 0)
    const igstPct = Number(inv.igst_pct || 0)
    const computedRate = (cgstPct + sgstPct) || igstPct || 18

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status,
      total_amount: total,
      subtotal,
      tax_rate: computedRate,
      tax_amount: computedTax,
      cgst_amount: cgstAmt,
      sgst_amount: sgstAmt,
      igst_amount: igstAmt,
      discount_amount: Number(inv.discount_amount || 0),
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      created_at: inv.created_at,
      invoice_items: (inv.invoice_items || []).map((it: any) => ({
        id: it.id,
        description: it.description,
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        amount: Number(it.quantity || 1) * Number(it.unit_price || 0),
        hsn_sac: it.hsn_sac || null,
      })),
      clients: inv.clients ? {
        id: inv.clients.id,
        name: inv.clients.name,
        company_name: inv.clients.company_name,
        gstin: inv.clients.gst_number,
        state: inv.clients.state,
        email: inv.clients.email,
        whatsapp: inv.clients.whatsapp,
      } : null,
    }
  })

  const userName = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <GstPageClient
      invoices={invoices}
      profile={{
        full_name: profile?.full_name || userName,
        business_name: profile?.business_name || 'Settlr Partner',
        gstin: profile?.gst_number || null,
        address: profile?.address || null,
        phone: profile?.phone || null,
      }}
      userName={userName}
      userEmail={userEmail}
    />
  )
}
