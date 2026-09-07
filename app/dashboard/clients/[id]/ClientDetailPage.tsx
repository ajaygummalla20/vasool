'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface Client {
  id: string; name: string; company_name: string | null
  email: string | null; phone: string | null; whatsapp: string | null
  gst_number: string | null; address: string | null
  city: string | null; state: string | null; pincode: string | null
  notes: string | null; created_at: string
  total_invoiced: number; total_paid: number; avg_payment_days: number | null
}

interface Invoice {
  id: string; invoice_number: string; status: string
  total_amount: number; amount_due: number
  issue_date: string; due_date: string
  sent_at: string | null; paid_at: string | null
}

interface Reminder {
  id: string; channel: string; status: string
  sent_at: string | null; days_overdue: number | null
  invoices: { invoice_number: string } | null
}

interface Props {
  client: Client; invoices: Invoice[]; reminders: Reminder[]
  userName: string; userEmail: string; userId: string
}

// ── Helpers ────────────────────────────────────────────────────
function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1).replace(/\.?0+$/, '')}K`
  return `₹${Math.round(n)}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function daysOverdue(dueDate: string) {
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  draft:          { label: 'Draft',     bg: '#F1EFE8', color: '#444441', dot: '#888780' },
  sent:           { label: 'Sent',      bg: '#E6F1FB', color: '#0C447C', dot: '#185FA5' },
  overdue:        { label: 'Overdue',   bg: '#FCEBEB', color: '#791F1F', dot: '#C0392B' },
  partially_paid: { label: 'Part paid', bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  paid:           { label: 'Paid',      bg: '#E1F5EE', color: '#085041', dot: '#1B5E3B' },
}

const COLORS = ['#1B5E3B','#185FA5','#854F0B','#7C3AED','#C85A1A','#0F766E']
function clientColor(name: string) {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

const STATES = [
  'Andhra Pradesh','Telangana','Karnataka','Tamil Nadu','Maharashtra',
  'Delhi','Uttar Pradesh','Gujarat','Rajasthan','West Bengal',
  'Madhya Pradesh','Kerala','Punjab','Haryana','Bihar','Other',
]

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Component ──────────────────────────────────────────────────
export default function ClientDetailPage({
  client: initialClient, invoices, reminders,
  userName, userEmail, userId,
}: Props) {
  const router = useRouter()
  const [client, setClient] = useState(initialClient)

  // ── Edit mode ──
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({
    name: client.name || '',
    company_name: client.company_name || '',
    email: client.email || '',
    phone: client.phone || '',
    whatsapp: client.whatsapp || '',
    gst_number: client.gst_number || '',
    address: client.address || '',
    city: client.city || '',
    state: client.state || 'Andhra Pradesh',
    pincode: client.pincode || '',
    notes: client.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const startEdit = () => {
    setForm({
      name: client.name || '',
      company_name: client.company_name || '',
      email: client.email || '',
      phone: client.phone || '',
      whatsapp: client.whatsapp || '',
      gst_number: client.gst_number || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || 'Andhra Pradesh',
      pincode: client.pincode || '',
      notes: client.notes || '',
    })
    setEditing(true)
    setSaved(false)
  }

  const cancelEdit = () => { setEditing(false); setSaved(false) }

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Client name is required'); return }
    setSaving(true)
    try {
      const sb = getSupabase()
      const { error } = await sb.from('clients').update({
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || form.phone.trim() || null,
        gst_number: form.gst_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        pincode: form.pincode.trim() || null,
        notes: form.notes.trim() || null,
      }).eq('id', client.id)

      if (error) throw error

      setClient(prev => ({
        ...prev,
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || form.phone.trim() || null,
        gst_number: form.gst_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        pincode: form.pincode.trim() || null,
        notes: form.notes.trim() || null,
      }))
      setSaved(true)
      setTimeout(() => { setEditing(false); setSaved(false) }, 1200)
    } catch (e) {
      console.error(e)
      alert('Error saving. Please try again.')
    } finally { setSaving(false) }
  }

  // ── Metrics ──
  const metrics = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
    const totalPaid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)
    const outstanding   = invoices.filter(i => !['paid','cancelled','draft'].includes(i.status)).reduce((s, i) => s + Number(i.amount_due), 0)
    const overdueCount  = invoices.filter(i => i.status === 'overdue').length
    return { totalInvoiced, totalPaid, outstanding, overdueCount, total: invoices.length }
  }, [invoices])

  const initials = client.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .cd-root{display:flex;min-height:100vh}
        .cd-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        /* topbar */
        .cd-top{background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);padding:0 28px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;flex-shrink:0}
        .cd-top-left{display:flex;align-items:center;gap:12px}
        .cd-back{width:30px;height:30px;border-radius:8px;border:.5px solid rgba(26,20,13,.12);background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
        .cd-back:hover{border-color:rgba(26,20,13,.25);background:#F7F5F0}
        .cd-top-av{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0}
        .cd-top-name{font-family:'Lora',serif;font-size:17px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .cd-top-company{font-size:11px;color:rgba(26,20,13,.45);margin-top:1px}
        .cd-top-right{display:flex;align-items:center;gap:8px}

        .cd-btn-primary{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(27,94,59,.28);transition:all .18s}
        .cd-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.36)}
        .cd-btn-sec{background:white;border:.5px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:500;color:rgba(26,20,13,.65);cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;transition:all .15s}
        .cd-btn-sec:hover{border-color:rgba(26,20,13,.24);color:#1A140D}
        .cd-btn-save{background:#1B5E3B;border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
        .cd-btn-save:disabled{opacity:.6;cursor:not-allowed}
        .cd-btn-cancel{background:white;border:.5px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 14px;font-size:12px;font-weight:500;color:rgba(26,20,13,.55);cursor:pointer;font-family:'DM Sans',sans-serif}

        .cd-content{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:16px}

        /* metrics */
        .cd-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .cd-met{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;padding:14px 16px;transition:box-shadow .18s}
        .cd-met:hover{box-shadow:0 4px 14px rgba(26,20,13,.07)}
        .cd-met-l{font-size:10px;font-weight:500;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .cd-met-v{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1A140D;letter-spacing:-.02em;line-height:1;margin-bottom:4px}
        .cd-met-s{font-size:10px;font-weight:500}

        /* body grid */
        .cd-body{display:grid;grid-template-columns:1fr 300px;gap:14px;align-items:start}

        /* card */
        .cd-card{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;overflow:hidden}
        .cd-card-hdr{padding:12px 16px;border-bottom:.5px solid rgba(26,20,13,.06);display:flex;align-items:center;justify-content:space-between}
        .cd-card-title{font-size:12px;font-weight:600;color:#1A140D}
        .cd-card-action{font-size:10px;font-weight:500;color:#1B5E3B;cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif}
        .cd-card-action:hover{text-decoration:underline}
        .cd-card-body{padding:14px 16px}

        /* invoice table */
        .cd-inv-hdr{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 80px;gap:8px;padding:8px 0;border-bottom:1px solid rgba(26,20,13,.08)}
        .cd-th{font-size:9px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.07em}
        .cd-th.r{text-align:right}

        .cd-inv-row{display:grid;grid-template-columns:2fr 1fr 1fr 1fr 80px;gap:8px;padding:11px 0;border-bottom:.5px solid rgba(26,20,13,.05);align-items:center;cursor:pointer;transition:background .12s}
        .cd-inv-row:hover{background:rgba(26,20,13,.02)}
        .cd-inv-row:last-child{border-bottom:none}
        .cd-inv-num{font-size:12px;font-weight:500;color:#1A140D}
        .cd-inv-date{font-size:11px;color:rgba(26,20,13,.50)}
        .cd-inv-amt{font-size:12px;font-weight:600;color:#1A140D;text-align:right}
        .cd-badge{font-size:9px;font-weight:600;padding:2px 8px;border-radius:100px;display:flex;align-items:center;gap:4px;width:fit-content}
        .cd-badge-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}

        /* info fields */
        .cd-info-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:.5px solid rgba(26,20,13,.05)}
        .cd-info-row:last-child{border-bottom:none}
        .cd-info-icon{font-size:13px;flex-shrink:0;margin-top:1px;width:20px;text-align:center}
        .cd-info-label{font-size:9px;font-weight:600;color:rgba(26,20,13,.35);text-transform:uppercase;letter-spacing:.07em;margin-bottom:2px}
        .cd-info-val{font-size:12px;color:#1A140D;line-height:1.4}
        .cd-info-none{font-size:12px;color:rgba(26,20,13,.30);font-style:italic}

        /* edit form */
        .cd-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .cd-edit-full{grid-column:1 / -1}
        .cd-edit-label{font-size:10px;font-weight:600;color:rgba(26,20,13,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
        .cd-edit-input{width:100%;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;transition:border-color .18s;background:white}
        .cd-edit-input:focus{border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.09)}
        .cd-edit-select{width:100%;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;background:white;cursor:pointer}
        .cd-edit-textarea{width:100%;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;resize:vertical;min-height:60px;transition:border-color .18s}
        .cd-edit-textarea:focus{border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.09)}
        .cd-edit-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}

        /* saved toast */
        .cd-saved{display:flex;align-items:center;gap:6px;background:rgba(27,94,59,.08);border:.5px solid rgba(27,94,59,.20);border-radius:8px;padding:8px 12px;font-size:11px;font-weight:600;color:#1B5E3B;margin-top:8px}

        /* activity */
        .cd-act-row{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:.5px solid rgba(26,20,13,.05)}
        .cd-act-row:last-child{border-bottom:none}
        .cd-act-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px}
        .cd-act-text{font-size:11px;color:rgba(26,20,13,.65);line-height:1.4;flex:1}
        .cd-act-time{font-size:9px;color:rgba(26,20,13,.35);flex-shrink:0}

        /* empty */
        .cd-empty{text-align:center;padding:30px 16px}
        .cd-empty-icon{font-size:32px;margin-bottom:10px}
        .cd-empty-title{font-size:14px;font-weight:600;color:#1A140D;margin-bottom:6px}
        .cd-empty-sub{font-size:12px;color:rgba(26,20,13,.45);line-height:1.5;margin-bottom:14px}
        .cd-empty-btn{background:#1B5E3B;border:none;border-radius:7px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif}

        @media(max-width:900px){
          .cd-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .cd-top{padding:14px 16px; height:auto; flex-wrap:wrap; gap:12px}
          .cd-top-right{width:100%; justify-content:flex-start}
          .cd-content{padding:16px}
          .cd-metrics{grid-template-columns:1fr 1fr}
          .cd-body{grid-template-columns:1fr}
          .cd-card-body{overflow-x:auto}
          .cd-inv-hdr, .cd-inv-row{min-width:500px}
          .cd-edit-grid{grid-template-columns:1fr}
        }
        @media(max-width:600px){
          .cd-metrics{grid-template-columns:1fr}
          .cd-top-right button{flex:1; justify-content:center}
        }
      `}</style>

      <div className="cd-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="cd-main">

          {/* Topbar */}
          <div className="cd-top">
            <div className="cd-top-left">
              <button className="cd-back" onClick={() => router.push('/dashboard/clients')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.65)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
              <div className="cd-top-av" style={{ background: clientColor(client.name) }}>{initials}</div>
              <div>
                <div className="cd-top-name">{client.name}</div>
                {client.company_name && <div className="cd-top-company">{client.company_name}</div>}
              </div>
            </div>
            <div className="cd-top-right">
              {!editing ? (
                <>
                  <button className="cd-btn-sec" onClick={startEdit}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                  <button className="cd-btn-primary" onClick={() => router.push(`/dashboard/invoices/new?client=${client.id}`)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    New Invoice
                  </button>
                </>
              ) : (
                <>
                  <button className="cd-btn-cancel" onClick={cancelEdit}>Cancel</button>
                  <button className="cd-btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="cd-content">

            {/* Metrics */}
            <div className="cd-metrics">
              {[
                { label: 'Total Invoiced', val: fmtINR(metrics.totalInvoiced), sub: `${metrics.total} invoice${metrics.total !== 1 ? 's' : ''}`, subColor: 'rgba(26,20,13,.40)' },
                { label: 'Total Collected', val: fmtINR(metrics.totalPaid), sub: metrics.totalPaid > 0 ? 'Payments received' : 'No payments yet', subColor: '#1B5E3B' },
                { label: 'Outstanding', val: fmtINR(metrics.outstanding), sub: metrics.overdueCount > 0 ? `${metrics.overdueCount} overdue` : 'All on track', subColor: metrics.overdueCount > 0 ? '#C0392B' : '#1B5E3B' },
                { label: 'Avg Payment', val: client.avg_payment_days ? `${client.avg_payment_days}d` : '—', sub: client.avg_payment_days ? 'Average days to pay' : 'No data yet', subColor: 'rgba(26,20,13,.40)' },
              ].map(m => (
                <div className="cd-met" key={m.label}>
                  <div className="cd-met-l">{m.label}</div>
                  <div className="cd-met-v">{m.val}</div>
                  <div className="cd-met-s" style={{ color: m.subColor }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Body grid */}
            <div className="cd-body">

              {/* LEFT: Invoice History */}
              <div className="cd-card">
                <div className="cd-card-hdr">
                  <span className="cd-card-title">Invoice History</span>
                  <button className="cd-card-action" onClick={() => router.push(`/dashboard/invoices/new?client=${client.id}`)}>
                    + New Invoice
                  </button>
                </div>

                {invoices.length === 0 ? (
                  <div className="cd-empty">
                    <div className="cd-empty-icon">🧾</div>
                    <div className="cd-empty-title">No invoices yet</div>
                    <div className="cd-empty-sub">Create the first invoice for {client.name} to start tracking payments.</div>
                    <button className="cd-empty-btn" onClick={() => router.push(`/dashboard/invoices/new?client=${client.id}`)}>
                      Create Invoice
                    </button>
                  </div>
                ) : (
                  <div className="cd-card-body" style={{ padding: '0 16px 8px' }}>
                    <div className="cd-inv-hdr">
                      <div className="cd-th">Invoice</div>
                      <div className="cd-th">Status</div>
                      <div className="cd-th r">Amount</div>
                      <div className="cd-th">Due Date</div>
                      <div className="cd-th r">Due</div>
                    </div>
                    {invoices.map(inv => {
                      const cfg = STATUS_CFG[inv.status] || STATUS_CFG.draft
                      const isOver = inv.status === 'overdue'
                      const isPaid = inv.status === 'paid'
                      return (
                        <div key={inv.id} className="cd-inv-row" onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>
                          <div>
                            <div className="cd-inv-num">{inv.invoice_number}</div>
                            <div className="cd-inv-date" style={{ fontSize: 9, marginTop: 2 }}>Issued {fmtDate(inv.issue_date)}</div>
                          </div>
                          <div>
                            <div className="cd-badge" style={{ background: cfg.bg, color: cfg.color }}>
                              <div className="cd-badge-dot" style={{ background: cfg.dot }} />
                              {cfg.label}
                            </div>
                          </div>
                          <div className="cd-inv-amt">{fmtINR(Number(inv.total_amount))}</div>
                          <div>
                            <div className="cd-inv-date">{fmtDate(inv.due_date)}</div>
                            {isOver && <div style={{ fontSize: 9, color: '#C0392B', fontWeight: 500, marginTop: 2 }}>{daysOverdue(inv.due_date)}d overdue</div>}
                            {isPaid && inv.paid_at && <div style={{ fontSize: 9, color: '#1B5E3B', fontWeight: 500, marginTop: 2 }}>Paid {fmtDate(inv.paid_at)}</div>}
                          </div>
                          <div className="cd-inv-amt" style={{ color: isPaid ? '#1B5E3B' : isOver ? '#C0392B' : '#1A140D' }}>
                            {isPaid ? '₹0' : fmtINR(Number(inv.amount_due))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT: Info + Activity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Client Info / Edit */}
                <div className="cd-card">
                  <div className="cd-card-hdr">
                    <span className="cd-card-title">{editing ? 'Edit Client' : 'Client Info'}</span>
                    {!editing && (
                      <button className="cd-card-action" onClick={startEdit}>Edit</button>
                    )}
                  </div>
                  <div className="cd-card-body">
                    {!editing ? (
                      <>
                        {[
                          { icon: '📧', label: 'Email',    val: client.email },
                          { icon: '📱', label: 'Phone',    val: client.phone },
                          { icon: '💬', label: 'WhatsApp', val: client.whatsapp },
                          { icon: '🏢', label: 'GST',      val: client.gst_number },
                          { icon: '📍', label: 'Location', val: [client.city, client.state].filter(Boolean).join(', ') || null },
                          { icon: '🏠', label: 'Address',  val: client.address },
                        ].map(info => (
                          <div key={info.label} className="cd-info-row">
                            <span className="cd-info-icon">{info.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div className="cd-info-label">{info.label}</div>
                              {info.val ? (
                                <div className="cd-info-val">{info.val}</div>
                              ) : (
                                <div className="cd-info-none">Not set</div>
                              )}
                            </div>
                          </div>
                        ))}
                        {client.notes && (
                          <div className="cd-info-row">
                            <span className="cd-info-icon">📝</span>
                            <div>
                              <div className="cd-info-label">Notes</div>
                              <div className="cd-info-val">{client.notes}</div>
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop: 10, fontSize: 9, color: 'rgba(26,20,13,.30)' }}>
                          Added {fmtDate(client.created_at)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="cd-edit-grid">
                          <div>
                            <div className="cd-edit-label">Name *</div>
                            <input className="cd-edit-input" value={form.name} onChange={e => set('name', e.target.value)} />
                          </div>
                          <div>
                            <div className="cd-edit-label">Company</div>
                            <input className="cd-edit-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                          </div>
                          <div>
                            <div className="cd-edit-label">Email</div>
                            <input className="cd-edit-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                          </div>
                          <div>
                            <div className="cd-edit-label">Phone</div>
                            <input className="cd-edit-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="10-digit" />
                          </div>
                          <div>
                            <div className="cd-edit-label">WhatsApp</div>
                            <input className="cd-edit-input" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="Same as phone if blank" />
                          </div>
                          <div>
                            <div className="cd-edit-label">GST Number</div>
                            <input className="cd-edit-input" value={form.gst_number} onChange={e => set('gst_number', e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <div className="cd-edit-label">City</div>
                            <input className="cd-edit-input" value={form.city} onChange={e => set('city', e.target.value)} />
                          </div>
                          <div>
                            <div className="cd-edit-label">State</div>
                            <select className="cd-edit-select" value={form.state} onChange={e => set('state', e.target.value)}>
                              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="cd-edit-full">
                            <div className="cd-edit-label">Address</div>
                            <input className="cd-edit-input" value={form.address} onChange={e => set('address', e.target.value)} />
                          </div>
                          <div>
                            <div className="cd-edit-label">Pincode</div>
                            <input className="cd-edit-input" value={form.pincode} onChange={e => set('pincode', e.target.value)} />
                          </div>
                          <div className="cd-edit-full">
                            <div className="cd-edit-label">Notes</div>
                            <textarea className="cd-edit-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} />
                          </div>
                        </div>
                        {saved && (
                          <div className="cd-saved">
                            <span>✓</span> Client updated successfully
                          </div>
                        )}
                        <div className="cd-edit-actions">
                          <button className="cd-btn-cancel" onClick={cancelEdit}>Cancel</button>
                          <button className="cd-btn-save" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="cd-card">
                  <div className="cd-card-hdr">
                    <span className="cd-card-title">Recent Activity</span>
                  </div>
                  <div className="cd-card-body">
                    {reminders.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: 11, color: 'rgba(26,20,13,.40)' }}>No reminders sent yet</div>
                      </div>
                    ) : (
                      reminders.map(r => (
                        <div key={r.id} className="cd-act-row">
                          <div className="cd-act-dot" style={{ background: r.days_overdue && r.days_overdue > 14 ? '#C0392B' : '#E8692A' }} />
                          <div className="cd-act-text">
                            Reminder sent for {r.invoices?.invoice_number || 'invoice'}
                            {r.days_overdue ? ` · ${r.days_overdue}d overdue` : ''}
                          </div>
                          <div className="cd-act-time">{fmtDateTime(r.sent_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
