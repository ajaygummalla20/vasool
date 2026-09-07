import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, total_amount, amount_due,
      discount_amount, cgst_pct, sgst_pct, igst_pct,
      issue_date, due_date, paid_at, payment_terms, late_fee_terms, notes,
      user_id
    `)
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('id, description, quantity, unit, unit_price, sort_order')
    .eq('invoice_id', id)
    .order('sort_order')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, gst_number, address, city, state, phone, upi_id, bank_name, bank_account, bank_ifsc, msme_udyam_number')
    .eq('id', invoice.user_id)
    .single()

  // Get client via the invoice's client relationship
  const { data: invWithClient } = await supabase
    .from('invoices')
    .select('clients ( name, company_name, email, gst_number, city, state, address )')
    .eq('id', id)
    .single()

  return NextResponse.json({
    invoice,
    items: items || [],
    sender: {
      name: profile?.business_name || profile?.full_name || 'Business',
      gst: profile?.gst_number || '',
      address: [profile?.address, profile?.city, profile?.state].filter(Boolean).join(', '),
      phone: profile?.phone || '',
      upiId: profile?.upi_id || '',
      bankName: profile?.bank_name || '',
      bankAccount: profile?.bank_account || '',
      bankIfsc: profile?.bank_ifsc || '',
      msmeUdyam: profile?.msme_udyam_number || '',
    },
    client: (invWithClient as any)?.clients?.[0] || null,
  })
}
