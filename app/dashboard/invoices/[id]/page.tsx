import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import InvoiceDetailPage from './InvoiceDetailPage'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailRoute({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // ── Auth check ──
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  // ── Profile ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, gst_number, address, phone, upi_id, bank_name, bank_account, bank_ifsc, msme_udyam_number')
    .eq('id', user.id)
    .single()

  // ── Invoice with all joins ──
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status,
      total_amount, amount_due, discount_amount,
      cgst_pct, sgst_pct, igst_pct,
      issue_date, due_date, sent_at, paid_at,
      payment_terms, late_fee_terms, notes,
      created_at,
      clients (
        id, name, company_name, email, phone, whatsapp,
        gst_number, city, state, address
      ),
      invoice_items (
        id, description, quantity, unit, unit_price, sort_order
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (invError || !invoice) notFound()

  // ── Payments ──
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, method, paid_at')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })

  // ── Reminders ──
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, channel, status, scheduled_at, sent_at, days_overdue')
    .eq('invoice_id', id)
    .order('scheduled_at', { ascending: true })

  const userName  = profile?.full_name  || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <InvoiceDetailPage
      invoice={invoice as any}
      invoiceItems={((invoice.invoice_items as any) || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)}
      client={(invoice.clients as any) || null}
      payments={(payments as any) || []}
      reminders={(reminders as any) || []}
      senderName={profile?.business_name || userName}
      senderGst={profile?.gst_number || ''}
      senderAddress={profile?.address || ''}
      upiId={profile?.upi_id || ''}
      bankName={profile?.bank_name || ''}
      bankAccount={profile?.bank_account || ''}
      bankIfsc={profile?.bank_ifsc || ''}
      msmeUdyamNumber={profile?.msme_udyam_number || ''}
      userName={userName}
      userEmail={userEmail}
      userId={user.id}
    />
  )
}
