'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface Client {
  id: string; name: string; company_name: string | null
  whatsapp: string | null; phone: string | null
}

interface Invoice {
  id: string; invoice_number: string; status: string
  total_amount: number; amount_due: number
  issue_date: string; due_date: string
  sent_at: string | null; paid_at: string | null
  created_at: string
  clients: Client | null
}

interface Props {
  userName: string; userEmail: string
  userId: string; initialInvoices: Invoice[]
}

// ── Helpers ────────────────────────────────────────────────────
function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1).replace(/\.?0+$/, '')}K`
  return `₹${Math.round(n)}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysOverdue(dueDate: string) {
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  draft:          { label: 'Draft',      bg: '#F1EFE8', color: '#444441', dot: '#888780' },
  sent:           { label: 'Sent',       bg: '#E6F1FB', color: '#0C447C', dot: '#185FA5' },
  overdue:        { label: 'Overdue',    bg: '#FCEBEB', color: '#791F1F', dot: '#C0392B' },
  partially_paid: { label: 'Part paid',  bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  paid:           { label: 'Paid',       bg: '#E1F5EE', color: '#085041', dot: '#1B5E3B' },
}

const FILTERS = ['All', 'Sent', 'Overdue', 'Paid', 'Draft'] as const
type Filter = typeof FILTERS[number]

const COLORS = ['#1B5E3B','#185FA5','#854F0B','#7C3AED','#C85A1A','#0F766E']
function clientColor(name: string) {
  let h = 0
  for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Component ──────────────────────────────────────────────────
export default function InvoicesListPage({
  userName, userEmail, userId, initialInvoices,
}: Props) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<Filter>('All')
  const [marking,  setMarking]  = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // ── Metrics ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const outstanding = invoices
      .filter(i => !['paid','cancelled','draft'].includes(i.status))
      .reduce((s, i) => s + Number(i.amount_due), 0)

    const overdue = invoices.filter(i => i.status === 'overdue')
    const overdueAmt = overdue.reduce((s, i) => s + Number(i.amount_due), 0)

    const paidThisMonth = invoices
      .filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at) >= firstOfMonth)
      .reduce((s, i) => s + Number(i.total_amount), 0)

    return {
      outstanding, overdueAmt, overdueCount: overdue.length,
      paidThisMonth, total: invoices.length,
    }
  }, [invoices])

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (inv.clients?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (inv.clients?.company_name || '').toLowerCase().includes(search.toLowerCase())

      const matchFilter =
        filter === 'All'    ? true :
        filter === 'Sent'   ? inv.status === 'sent' :
        filter === 'Overdue'? inv.status === 'overdue' :
        filter === 'Paid'   ? inv.status === 'paid' :
        filter === 'Draft'  ? inv.status === 'draft' : true

      return matchSearch && matchFilter
    })
  }, [invoices, search, filter])

  // ── Mark as paid ──────────────────────────────────────────────
  const markPaid = async (inv: Invoice) => {
    setMarking(inv.id)
    setMenuOpen(null)
    try {
      const sb = getSupabase()
      await sb.from('invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        amount_due: 0,
      }).eq('id', inv.id)

      await sb.from('payments').insert({
        invoice_id: inv.id,
        user_id: userId,
        amount: inv.amount_due,
        method: 'other',
        paid_at: new Date().toISOString(),
      })

      await sb.from('reminders')
        .update({ status: 'skipped' })
        .eq('invoice_id', inv.id)
        .eq('status', 'scheduled')

      setInvoices(p => p.map(i =>
        i.id === inv.id ? { ...i, status: 'paid', amount_due: 0, paid_at: new Date().toISOString() } : i
      ))
    } catch (e) {
      console.error(e)
      alert('Error marking as paid. Please try again.')
    } finally {
      setMarking(null)
    }
  }

  // ── Send reminder ─────────────────────────────────────────────
  const sendReminder = (inv: Invoice) => {
    setMenuOpen(null)
    const client = inv.clients
    if (!client?.whatsapp && !client?.phone) {
      alert('No WhatsApp number found for this client. Add one in the Clients section.')
      return
    }
    const phone = (client.whatsapp || client.phone || '').replace(/\D/g, '')
    const days = daysOverdue(inv.due_date)
    const msg = encodeURIComponent(
      `Hi ${client.name},\n\nThis is a gentle reminder that Invoice ${inv.invoice_number} for ${fmtINR(Number(inv.amount_due))} is ${days > 0 ? `${days} days overdue` : 'due soon'}.\n\nKindly process the payment at your earliest convenience.\n\nThank you.`
    )
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .il-root{display:flex;min-height:100vh}
        .il-main{flex:1;margin-left:200px;display:flex;flex-direction:column;height:100vh;overflow:hidden}

        /* topbar */
        .il-top{background:#FDFAF5;border-bottom:1px solid rgba(26,20,13,.10);padding:0 28px;height:56px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 0 rgba(26,20,13,.05)}
        .il-top-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .il-top-sub{font-size:11px;color:rgba(26,20,13,.38);margin-top:2px}
        .il-top-r{display:flex;align-items:center;gap:10px}

        /* search */
        .il-search-wrap{position:relative}
        .il-search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);pointer-events:none}
        .il-search{background:white;border:1px solid rgba(26,20,13,.11);border-radius:8px;padding:7px 12px 7px 34px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;width:220px;transition:all .18s}
        .il-search:focus{border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.09);width:260px}
        .il-search::placeholder{color:rgba(26,20,13,.28)}

        /* new invoice btn */
        .il-new-btn{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(27,94,59,.28);transition:all .18s}
        .il-new-btn:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.36)}

        /* content */
        .il-content{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:16px}

        /* metrics row */
        .il-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .il-met{background:#FDFAF5;border:1px solid rgba(26,20,13,.07);border-radius:12px;padding:14px 16px;transition:box-shadow .18s}
        .il-met:hover{box-shadow:0 4px 14px rgba(26,20,13,.07)}
        .il-met-l{font-size:10px;font-weight:500;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .il-met-v{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1A140D;letter-spacing:-.02em;line-height:1;margin-bottom:4px}
        .il-met-s{font-size:10px;font-weight:500}

        /* filter bar */
        .il-filters{display:flex;align-items:center;gap:6px}
        .il-filter-btn{padding:6px 14px;border-radius:20px;border:1px solid rgba(26,20,13,.10);background:white;font-size:12px;font-weight:500;color:rgba(26,20,13,.50);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
        .il-filter-btn:hover{border-color:rgba(26,20,13,.20);color:#1A140D}
        .il-filter-btn.on{background:#1A140D;color:white;border-color:#1A140D}
        .il-filter-count{font-size:10px;background:rgba(255,255,255,.20);border-radius:10px;padding:1px 5px;margin-left:3px}
        .il-filter-count.off{background:rgba(26,20,13,.08);color:rgba(26,20,13,.45)}

        /* table */
        .il-table-wrap{background:#FDFAF5;border:1px solid rgba(26,20,13,.07);border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(26,20,13,.04);flex:1}

        .il-table-hdr{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 100px;gap:8px;padding:10px 18px;background:#F7F5F0;border-bottom:1px solid rgba(26,20,13,.07)}
        .il-th{font-size:9px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.07em}
        .il-th.r{text-align:right}

        .il-row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 100px;gap:8px;padding:12px 18px;border-bottom:1px solid rgba(26,20,13,.04);align-items:center;transition:background .12s;cursor:pointer;position:relative}
        .il-row:last-child{border-bottom:none}
        .il-row:hover{background:#FAFAF8}
        .il-row.overdue-row{border-left:3px solid #C0392B}

        /* client cell */
        .il-client{display:flex;align-items:center;gap:9px;min-width:0}
        .il-av{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;flex-shrink:0}
        .il-client-name{font-size:13px;font-weight:500;color:#1A140D;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .il-client-inv{font-size:10px;color:rgba(26,20,13,.38);margin-top:1px}

        /* status badge */
        .il-badge{font-size:10px;font-weight:600;padding:3px 9px;border-radius:100px;width:fit-content;display:flex;align-items:center;gap:5px}
        .il-badge-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}

        /* amount cells */
        .il-amt{font-size:13px;font-weight:600;color:#1A140D;text-align:right}
        .il-amt-due{font-size:13px;font-weight:600;text-align:right}
        .il-date{font-size:11px;color:rgba(26,20,13,.50)}
        .il-overdue-days{font-size:9px;color:#C0392B;font-weight:500;margin-top:2px}

        /* actions */
        .il-actions{display:flex;justify-content:flex-end;gap:4px;position:relative}
        .il-act-btn{width:28px;height:28px;border-radius:7px;border:1px solid rgba(26,20,13,.10);background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
        .il-act-btn:hover{border-color:rgba(26,20,13,.22);background:#F7F5F0}
        .il-act-btn.green{border-color:rgba(27,94,59,.25);background:rgba(27,94,59,.06)}
        .il-act-btn.green:hover{background:rgba(27,94,59,.12)}

        /* dropdown menu */
        .il-menu{position:absolute;top:calc(100% + 4px);right:0;background:white;border:1px solid rgba(26,20,13,.12);border-radius:10px;box-shadow:0 8px 28px rgba(26,20,13,.14);z-index:50;min-width:180px;overflow:hidden}
        .il-menu-item{display:flex;align-items:center;gap:9px;padding:10px 14px;font-size:12px;color:#1A140D;cursor:pointer;transition:background .12s;border:none;background:transparent;width:100%;text-align:left;font-family:'DM Sans',sans-serif}
        .il-menu-item:hover{background:#F7F5F0}
        .il-menu-item.red{color:#C0392B}
        .il-menu-item.red:hover{background:#FEF2F2}
        .il-menu-divider{height:1px;background:rgba(26,20,13,.07);margin:2px 0}

        /* empty state */
        .il-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:12px;text-align:center;flex:1}
        .il-empty-icon{font-size:40px;margin-bottom:4px}
        .il-empty-title{font-size:16px;font-weight:600;color:#1A140D;font-family:'Lora',serif}
        .il-empty-sub{font-size:13px;color:rgba(26,20,13,.45);max-width:320px;line-height:1.55}
        .il-empty-btn{background:#1B5E3B;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:4px;transition:all .18s}
        .il-empty-btn:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.32)}

        /* skeleton */
        .il-skel{height:52px;background:linear-gradient(90deg,rgba(26,20,13,.04) 0%,rgba(26,20,13,.08) 50%,rgba(26,20,13,.04) 100%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:0;border-bottom:1px solid rgba(26,20,13,.05)}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        @media(max-width:900px){
          .il-main{margin-left:0; padding-top:56px; padding-bottom:80px; height:auto; min-height:100vh; overflow:visible}
          .il-top{padding:14px 16px; height:auto; flex-wrap:wrap; gap:12px}
          .il-top-r{width:100%; justify-content:space-between}
          .il-search{width:100%; max-width:240px}
          .il-content{padding:16px}
          .il-metrics{grid-template-columns:1fr 1fr}
          .il-table-wrap{overflow-x:auto}
          .il-table-hdr, .il-row{min-width:620px}
          .il-filters{overflow-x:auto; padding-bottom:4px; width:100%}
        }
        @media(max-width:540px){
          .il-metrics{grid-template-columns:1fr}
          .il-top-r{flex-direction:column; align-items:stretch}
          .il-search{max-width:100%}
          .il-new-btn{justify-content:center}
        }
      `}</style>

      <div className="il-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="il-main">
          {/* Topbar */}
          <div className="il-top">
            <div>
              <div className="il-top-title">Invoices</div>
              <div className="il-top-sub">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
              </div>
            </div>
            <div className="il-top-r">
              <div className="il-search-wrap">
                <svg className="il-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className="il-search"
                  placeholder="Search by client or invoice…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="il-new-btn" onClick={() => router.push('/dashboard/invoices/new')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                New invoice
              </button>
            </div>
          </div>

          <div className="il-content">
            {/* Metrics */}
            <div className="il-metrics">
              {[
                { label: 'Total outstanding',    val: fmtINR(metrics.outstanding), sub: `${invoices.filter(i => !['paid','draft','cancelled'].includes(i.status)).length} invoices`, subColor: '#BA7517' },
                { label: 'Overdue',              val: fmtINR(metrics.overdueAmt),  sub: metrics.overdueCount > 0 ? `${metrics.overdueCount} invoice${metrics.overdueCount>1?'s':''} overdue` : 'None overdue', subColor: metrics.overdueCount > 0 ? '#C0392B' : '#1B5E3B' },
                { label: 'Collected this month', val: fmtINR(metrics.paidThisMonth), sub: 'Via all payment methods', subColor: '#1B5E3B' },
                { label: 'Total invoices',       val: String(metrics.total),        sub: `${invoices.filter(i=>i.status==='paid').length} paid · ${invoices.filter(i=>i.status==='draft').length} draft`, subColor: 'rgba(26,20,13,.40)' },
              ].map(m => (
                <div className="il-met" key={m.label}>
                  <div className="il-met-l">{m.label}</div>
                  <div className="il-met-v">{m.val}</div>
                  <div className="il-met-s" style={{ color: m.subColor }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="il-filters">
              {FILTERS.map(f => {
                const count =
                  f === 'All'     ? invoices.length :
                  f === 'Sent'    ? invoices.filter(i => i.status === 'sent').length :
                  f === 'Overdue' ? invoices.filter(i => i.status === 'overdue').length :
                  f === 'Paid'    ? invoices.filter(i => i.status === 'paid').length :
                  invoices.filter(i => i.status === 'draft').length

                return (
                  <button
                    key={f}
                    className={`il-filter-btn ${filter === f ? 'on' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                    <span className={`il-filter-count ${filter === f ? '' : 'off'}`}>{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Table */}
            <div className="il-table-wrap">
              {/* Header */}
              <div className="il-table-hdr">
                <div className="il-th">Client / Invoice</div>
                <div className="il-th">Status</div>
                <div className="il-th r">Total</div>
                <div className="il-th r">Amount due</div>
                <div className="il-th">Due date</div>
                <div className="il-th r">Actions</div>
              </div>

              {/* Rows */}
              {filtered.length === 0 ? (
                <div className="il-empty">
                  <div className="il-empty-icon">
                    {search || filter !== 'All' ? '🔍' : '🧾'}
                  </div>
                  <div className="il-empty-title">
                    {search ? `No results for "${search}"` :
                     filter !== 'All' ? `No ${filter.toLowerCase()} invoices` :
                     'No invoices yet'}
                  </div>
                  <div className="il-empty-sub">
                    {search || filter !== 'All'
                      ? 'Try a different search or filter.'
                      : 'Create your first invoice to start tracking payments and sending automated reminders.'}
                  </div>
                  {!search && filter === 'All' && (
                    <button className="il-empty-btn" onClick={() => router.push('/dashboard/invoices/new')}>
                      Create first invoice
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(inv => {
                  const cfg     = STATUS_CFG[inv.status] || STATUS_CFG.draft
                  const client  = inv.clients
                  const name    = client?.name || 'Unknown client'
                  const overdue = daysOverdue(inv.due_date)
                  const isOver  = inv.status === 'overdue'
                  const isPaid  = inv.status === 'paid'

                  return (
                    <div
                      key={inv.id}
                      className={`il-row${isOver ? ' overdue-row' : ''}`}
                      onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                    >
                      {/* Client */}
                      <div className="il-client" onClick={e => e.stopPropagation()}>
                        <div className="il-av" style={{ background: clientColor(name) }}>
                          {name.slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="il-client-name">{name}</div>
                          <div className="il-client-inv">{inv.invoice_number}</div>
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div className="il-badge" style={{ background: cfg.bg, color: cfg.color }}>
                          <div className="il-badge-dot" style={{ background: cfg.dot }}/>
                          {cfg.label}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="il-amt">{fmtINR(Number(inv.total_amount))}</div>

                      {/* Amount due */}
                      <div>
                        <div className="il-amt-due" style={{ color: isOver ? '#C0392B' : isPaid ? '#1B5E3B' : '#1A140D' }}>
                          {isPaid ? '₹0' : fmtINR(Number(inv.amount_due))}
                        </div>
                        {isOver && overdue > 0 && (
                          <div className="il-overdue-days">{overdue}d overdue</div>
                        )}
                      </div>

                      {/* Due date */}
                      <div>
                        <div className="il-date">{fmtDate(inv.due_date)}</div>
                        {isPaid && inv.paid_at && (
                          <div style={{ fontSize: 9, color: '#1B5E3B', fontWeight: 500, marginTop: 2 }}>
                            Paid {fmtDate(inv.paid_at)}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="il-actions" onClick={e => e.stopPropagation()}>

                        {/* Mark paid — quick action */}
                        {!isPaid && (
                          <button
                            className="il-act-btn green"
                            title="Mark as paid"
                            disabled={marking === inv.id}
                            onClick={() => markPaid(inv)}
                          >
                            {marking === inv.id
                              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1B5E3B" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1B5E3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            }
                          </button>
                        )}

                        {/* WhatsApp reminder */}
                        {!isPaid && (
                          <button
                            className="il-act-btn"
                            title="Send WhatsApp reminder"
                            onClick={() => sendReminder(inv)}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                            </svg>
                          </button>
                        )}

                        {/* More menu */}
                        <button
                          className="il-act-btn"
                          title="More actions"
                          onClick={() => setMenuOpen(p => p === inv.id ? null : inv.id)}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.55)" strokeWidth="2.5" strokeLinecap="round">
                            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                          </svg>
                        </button>

                        {/* Dropdown */}
                        {menuOpen === inv.id && (
                          <div className="il-menu">
                            <button className="il-menu-item" onClick={() => { setMenuOpen(null); router.push(`/dashboard/invoices/${inv.id}`) }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              View invoice
                            </button>
                            {!isPaid && (
                              <>
                                <button className="il-menu-item" onClick={() => sendReminder(inv)}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                                  Send WhatsApp reminder
                                </button>
                                <button className="il-menu-item" onClick={() => { setMenuOpen(null); markPaid(inv) }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                  Mark as paid
                                </button>
                              </>
                            )}
                            <div className="il-menu-divider"/>
                            <button className="il-menu-item" onClick={() => router.push(`/dashboard/invoices/new?duplicate=${inv.id}`)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                              Duplicate invoice
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  )
}