'use client'

import { useState, useEffect } from 'react'

interface InvoiceItem { id: string; description: string; quantity: number; unit: string; unit_price: number }
interface InvoiceData {
  invoice: { id: string; invoice_number: string; status: string; total_amount: number; amount_due: number; discount_amount: number | null; cgst_pct: number | null; sgst_pct: number | null; igst_pct: number | null; issue_date: string; due_date: string; paid_at: string | null; payment_terms: string | null; late_fee_terms: string | null; notes: string | null }
  items: InvoiceItem[]
  sender: { name: string; gst: string; address: string; phone: string; upiId?: string; bankName?: string; bankAccount?: string; bankIfsc?: string; msmeUdyam?: string }
  client: { name: string; company_name: string | null; email: string | null; gst_number: string | null; city: string | null; state: string | null; address: string | null } | null
}

function fmtINR(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n) }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' }

function amountInWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only'
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  function cvt(n: number): string { if (n === 0) return ''; if (n < 20) return ones[n]; if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''); return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + cvt(n % 100) : '') }
  const ip = Math.floor(Math.abs(num)); const ps = Math.round((Math.abs(num) - ip) * 100)
  let r = ''; const cr = Math.floor(ip / 10000000); const lk = Math.floor((ip % 10000000) / 100000); const th = Math.floor((ip % 100000) / 1000); const rm = ip % 1000
  if (cr) r += cvt(cr) + ' Crore '; if (lk) r += cvt(lk) + ' Lakh '; if (th) r += cvt(th) + ' Thousand '; if (rm) r += cvt(rm)
  r = r.trim() + ' Rupees'; if (ps > 0) r += ' and ' + cvt(ps) + ' Paise'; return r + ' Only'
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: 'Draft', bg: '#F1EFE8', color: '#444441', border: '#DDD' },
  sent: { label: 'Sent', bg: '#E6F1FB', color: '#0C447C', border: '#B3D4F0' },
  overdue: { label: 'Overdue', bg: '#FCEBEB', color: '#791F1F', border: '#F0BFBF' },
  partially_paid: { label: 'Partially Paid', bg: '#FAEEDA', color: '#633806', border: '#E8D5A8' },
  paid: { label: 'Paid', bg: '#E1F5EE', color: '#085041', border: '#A8DFC8' },
}

export default function PublicInvoicePage({ invoiceId }: { invoiceId: string }) {
  const [data, setData] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/invoices/${invoiceId}/public`)
      .then(r => { if (!r.ok) throw new Error('Invoice not found'); return r.json() })
      .then(setData)
      .catch(() => setError('Invoice not found or link has expired.'))
      .finally(() => setLoading(false))
  }, [invoiceId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif", color: '#888' }}>
      <div>Loading invoice...</div>
    </div>
  )

  if (error || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif", flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 48 }}>📄</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Invoice Not Found</div>
      <div style={{ color: '#888' }}>{error}</div>
    </div>
  )

  const { invoice, items, sender, client } = data
  const cfg = STATUS_CFG[invoice.status] || STATUS_CFG.draft

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discount = Number(invoice.discount_amount || 0)
  const afterDisc = subtotal - discount
  const cgstAmt = (invoice.cgst_pct || 0) > 0 ? afterDisc * (invoice.cgst_pct || 0) / 100 : 0
  const sgstAmt = (invoice.sgst_pct || 0) > 0 ? afterDisc * (invoice.sgst_pct || 0) / 100 : 0
  const igstAmt = (invoice.igst_pct || 0) > 0 ? afterDisc * (invoice.igst_pct || 0) / 100 : 0
  const grand = Number(invoice.total_amount)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F8F7F4;color:#1A140D}
        .pub-wrap{max-width:820px;margin:0 auto;padding:32px 20px}
        .pub-topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding:12px 20px;background:white;border-radius:12px;border:.5px solid rgba(26,20,13,.08);box-shadow:0 1px 4px rgba(0,0,0,.04)}
        .pub-topbar-brand{font-family:'Lora',serif;font-size:16px;font-weight:700;color:#1B5E3B}
        .pub-topbar-actions{display:flex;gap:8px}
        .pub-btn{padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;border:none;transition:all .15s}
        .pub-btn-print{background:white;border:.5px solid rgba(26,20,13,.12);color:rgba(26,20,13,.65)}
        .pub-btn-print:hover{border-color:#1B5E3B;color:#1B5E3B}

        .pub-card{background:white;border-radius:16px;border:.5px solid rgba(26,20,13,.08);box-shadow:0 2px 12px rgba(0,0,0,.04);overflow:hidden}
        .pub-header{padding:28px 32px;border-bottom:.5px solid rgba(26,20,13,.06);display:flex;justify-content:space-between;align-items:flex-start}
        .pub-brand{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1B5E3B}
        .pub-brand-sub{font-size:10px;color:#999;margin-top:2px}
        .pub-inv-title{font-family:'Lora',serif;font-size:18px;font-weight:700;text-align:right}
        .pub-inv-num{font-size:10px;color:#888;text-align:right;margin-top:2px}
        .pub-status{display:inline-block;padding:4px 12px;border-radius:100px;font-size:10px;font-weight:700;margin-top:6px}

        .pub-body{padding:28px 32px}
        .pub-parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
        .pub-label{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px}
        .pub-name{font-size:14px;font-weight:700;color:#1A140D}
        .pub-line{font-size:11px;color:#666;margin-top:2px}

        .pub-dates{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;padding:10px 14px;background:#FAFAF8;border-radius:8px}
        .pub-date-label{font-size:9px;font-weight:700;color:#999;text-transform:uppercase}
        .pub-date-val{font-size:12px;font-weight:600;margin-top:2px}

        .pub-table{width:100%;border-collapse:collapse;margin-bottom:16px}
        .pub-table th{background:#F5F4F0;font-size:9px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.06em;padding:10px 14px;text-align:left;border-bottom:1px solid #EDEDE8}
        .pub-table th.r{text-align:right}
        .pub-table td{padding:10px 14px;border-bottom:1px solid #F5F4F0;font-size:12px;color:#333}
        .pub-table td.r{text-align:right}
        .pub-table td.bold{font-weight:700}

        .pub-totals{display:flex;flex-direction:column;align-items:flex-end;margin-bottom:16px}
        .pub-total-row{display:flex;gap:32px;padding:3px 0;font-size:11px;width:260px}
        .pub-total-row .lbl{flex:1;color:#777}
        .pub-total-row .val{text-align:right;font-weight:600;min-width:90px}
        .pub-total-grand{display:flex;gap:32px;padding:10px 14px;font-size:14px;font-weight:700;width:260px;background:rgba(27,94,59,.06);border-radius:8px;border:1px solid rgba(27,94,59,.15);color:#1B5E3B;margin-top:4px}
        .pub-total-grand .lbl{flex:1}
        .pub-total-grand .val{text-align:right;min-width:90px}

        .pub-words{font-size:11px;font-style:italic;color:#666;padding:8px 12px;background:#FAFAF8;border-left:3px solid #1B5E3B;border-radius:4px;margin-bottom:16px}
        .pub-notes{margin-bottom:12px}
        .pub-notes-label{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;margin-bottom:4px}
        .pub-notes-text{font-size:11px;color:#666}

        .pub-footer{padding:16px 32px;border-top:.5px solid rgba(26,20,13,.06);display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#BBB}

        @media print {
          .pub-topbar{display:none!important}
          body{background:white!important}
          .pub-card{box-shadow:none!important;border:none!important}
        }
        @media(max-width:600px){
          .pub-wrap{padding:12px 10px}
          .pub-header{padding:18px 16px; flex-direction:column; gap:12px}
          .pub-inv-title, .pub-inv-num{text-align:left}
          .pub-body{padding:18px 14px}
          .pub-parties, .pub-dates{grid-template-columns:1fr}
          .pub-table-wrap{overflow-x:auto}
          .pub-table{min-width:480px}
          .pub-totals{align-items:stretch}
          .pub-total-row, .pub-total-grand{width:100%}
        }
      `}</style>

      <div className="pub-wrap">
        <div className="pub-topbar">
          <div className="pub-topbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/settlr-logo.png" alt="Settlr" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover' }} />
            <span>Settlr</span>
          </div>
          <div className="pub-topbar-actions">
            <button className="pub-btn pub-btn-print" onClick={() => window.print()}>🖨 Download PDF</button>
          </div>
        </div>

        <div className="pub-card">
          <div className="pub-header">
            <div>
              <div className="pub-brand">{sender.name}</div>
              <div className="pub-brand-sub">
                {sender.gst && <>GSTIN: {sender.gst} · </>}
                {sender.address || 'India'}
              </div>
            </div>
            <div>
              <div className="pub-inv-title">TAX INVOICE</div>
              <div className="pub-inv-num">{invoice.invoice_number}</div>
              <div className="pub-status" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </div>
            </div>
          </div>

          <div className="pub-body">
            <div className="pub-parties">
              <div>
                <div className="pub-label">From</div>
                <div className="pub-name">{sender.name}</div>
                {sender.gst && <div className="pub-line">GSTIN: {sender.gst}</div>}
                {sender.address && <div className="pub-line">{sender.address}</div>}
                {sender.phone && <div className="pub-line">📞 {sender.phone}</div>}
              </div>
              <div>
                <div className="pub-label">To</div>
                <div className="pub-name">{client?.name || 'Client'}</div>
                {client?.company_name && <div className="pub-line">{client.company_name}</div>}
                {client?.gst_number && <div className="pub-line">GSTIN: {client.gst_number}</div>}
                {client?.email && <div className="pub-line">{client.email}</div>}
                {(client?.city || client?.state) && (
                  <div className="pub-line">{[client?.address, client?.city, client?.state].filter(Boolean).join(', ')}</div>
                )}
              </div>
            </div>

            <div className="pub-dates">
              <div>
                <div className="pub-date-label">Issue Date</div>
                <div className="pub-date-val">{fmtDate(invoice.issue_date)}</div>
              </div>
              <div>
                <div className="pub-date-label">Due Date</div>
                <div className="pub-date-val">{fmtDate(invoice.due_date)}</div>
              </div>
              <div>
                <div className="pub-date-label">Payment Terms</div>
                <div className="pub-date-val">{invoice.payment_terms || 'Net 30'}</div>
              </div>
            </div>

            <div className="pub-table-wrap">
              <table className="pub-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th className="r">Qty</th>
                    <th className="r">Unit</th>
                    <th className="r">Rate</th>
                    <th className="r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>{item.description}</td>
                      <td className="r">{item.quantity}</td>
                      <td className="r">{item.unit}</td>
                      <td className="r">{fmtINR(item.unit_price)}</td>
                      <td className="r bold">{fmtINR(item.quantity * item.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pub-totals">
              <div className="pub-total-row"><span className="lbl">Subtotal</span><span className="val">{fmtINR(subtotal)}</span></div>
              {discount > 0 && <div className="pub-total-row"><span className="lbl">Discount</span><span className="val" style={{ color: '#1B5E3B' }}>−{fmtINR(discount)}</span></div>}
              {cgstAmt > 0 && <div className="pub-total-row"><span className="lbl">CGST ({invoice.cgst_pct}%)</span><span className="val">{fmtINR(cgstAmt)}</span></div>}
              {sgstAmt > 0 && <div className="pub-total-row"><span className="lbl">SGST ({invoice.sgst_pct}%)</span><span className="val">{fmtINR(sgstAmt)}</span></div>}
              {igstAmt > 0 && <div className="pub-total-row"><span className="lbl">IGST ({invoice.igst_pct}%)</span><span className="val">{fmtINR(igstAmt)}</span></div>}
              <div className="pub-total-grand"><span className="lbl">Grand Total</span><span className="val">{fmtINR(grand)}</span></div>
            </div>

            <div className="pub-words">
              <strong>Amount in Words:</strong> {amountInWords(grand)}
            </div>

            {/* Instant Scan & Pay (UPI) & Bank Details */}
            {invoice.status !== 'paid' && (sender.upiId || sender.bankAccount) && (
              <div style={{ background: 'linear-gradient(135deg, rgba(27,94,59,.06), rgba(27,94,59,.02))', border: '1px solid rgba(27,94,59,.2)', borderRadius: 12, padding: '18px 22px', margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1B5E3B', textTransform: 'uppercase', letterSpacing: '.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📱</span> Pay via UPI / Bank Wire
                  </div>
                  {sender.upiId && (
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A140D', marginTop: 6 }}>
                      UPI ID: <span style={{ color: '#1B5E3B' }}>{sender.upiId}</span>
                    </div>
                  )}
                  {sender.bankName && (
                    <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
                      Bank: <strong>{sender.bankName}</strong> · A/C: <strong>{sender.bankAccount}</strong> · IFSC: <strong>{sender.bankIfsc}</strong>
                    </div>
                  )}
                  {sender.msmeUdyam && (
                    <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                      🛡️ Protected MSME Supplier · URN: {sender.msmeUdyam}
                    </div>
                  )}
                  {sender.upiId && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button
                        style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid rgba(27,94,59,.3)', background: 'white', color: '#1B5E3B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                        onClick={() => {
                          navigator.clipboard.writeText(sender.upiId!)
                          alert('UPI ID copied!')
                        }}
                      >
                        Copy UPI ID
                      </button>
                      <a
                        href={`upi://pay?pa=${sender.upiId}&pn=${encodeURIComponent(sender.name)}&am=${invoice.amount_due || invoice.total_amount}&cu=INR&tn=Inv-${invoice.invoice_number}`}
                        style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: '#1B5E3B', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        ⚡ Pay on UPI App
                      </a>
                    </div>
                  )}
                </div>

                {sender.upiId && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ background: 'white', padding: 6, borderRadius: 8, border: '1px solid rgba(0,0,0,.08)', display: 'inline-block', boxShadow: '0 2px 6px rgba(0,0,0,.05)' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=4&data=${encodeURIComponent(`upi://pay?pa=${sender.upiId}&pn=${encodeURIComponent(sender.name)}&am=${invoice.amount_due || invoice.total_amount}&cu=INR&tn=Inv-${invoice.invoice_number}`)}`}
                        alt="Scan & Pay"
                        style={{ width: 110, height: 110, display: 'block' }}
                      />
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1B5E3B', marginTop: 4 }}>
                      Scan with GPay / PhonePe
                    </div>
                  </div>
                )}
              </div>
            )}

            {invoice.notes && (
              <div className="pub-notes">
                <div className="pub-notes-label">Notes</div>
                <div className="pub-notes-text">{invoice.notes}</div>
              </div>
            )}
            {invoice.late_fee_terms && (
              <div className="pub-notes">
                <div className="pub-notes-label">Late Fee Terms</div>
                <div className="pub-notes-text">{invoice.late_fee_terms}</div>
              </div>
            )}
          </div>

          <div className="pub-footer">
            <div>Computer Generated Invoice · Settlr Financial OS</div>
            <div>© {new Date().getFullYear()}</div>
          </div>
        </div>
      </div>
    </>
  )
}
