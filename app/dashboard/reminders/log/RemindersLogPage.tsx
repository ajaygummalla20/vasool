'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface ClientInfo {
  id: string
  name: string
  company_name: string | null
  whatsapp: string | null
  phone: string | null
}

interface InvoiceInfo {
  id: string
  invoice_number: string
  total_amount: number
  amount_due: number
  due_date: string
  status: string
  clients: ClientInfo | null
}

interface Reminder {
  id: string
  invoice_id: string
  channel: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  days_overdue: number | null
  used_contract_context: boolean | null
  invoices: InvoiceInfo | null
}

interface Props {
  reminders: Reminder[]
  userName: string
  userEmail: string
  businessName: string
}

// ── Helpers ────────────────────────────────────────────────────
function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  sent:      { label: 'Sent',      bg: '#E1F5EE', color: '#085041', dot: '#1B5E3B' },
  scheduled: { label: 'Scheduled', bg: '#E6F1FB', color: '#0C447C', dot: '#185FA5' },
  skipped:   { label: 'Skipped',   bg: '#F1EFE8', color: '#444441', dot: '#888780' },
  failed:    { label: 'Failed',    bg: '#FCEBEB', color: '#791F1F', dot: '#C0392B' },
}

export default function RemindersLogPageClient({
  reminders,
  userName,
  userEmail,
  businessName,
}: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'sent' | 'scheduled' | 'skipped'>('all')
  const [search, setSearch] = useState('')

  // Filtered list
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      // Filter tab
      if (filter !== 'all' && r.status !== filter) return false

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const clientName = r.invoices?.clients?.name?.toLowerCase() || ''
        const companyName = r.invoices?.clients?.company_name?.toLowerCase() || ''
        const invNum = r.invoices?.invoice_number?.toLowerCase() || ''
        if (!clientName.includes(q) && !companyName.includes(q) && !invNum.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [reminders, filter, search])

  // Metrics
  const totalSent = reminders.filter(r => r.status === 'sent').length
  const totalScheduled = reminders.filter(r => r.status === 'scheduled').length
  const totalSkipped = reminders.filter(r => r.status === 'skipped').length
  const totalAmountRecovered = reminders
    .filter(r => r.status === 'sent' && r.invoices?.status === 'paid')
    .reduce((acc, r) => acc + Number(r.invoices?.total_amount || 0), 0)

  // Generate WhatsApp pre-filled text link
  const getWhatsAppLink = (r: Reminder) => {
    const phone = r.invoices?.clients?.whatsapp || r.invoices?.clients?.phone || ''
    const cleanPhone = phone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone

    const clientName = r.invoices?.clients?.name || 'Client'
    const invNum = r.invoices?.invoice_number || 'Invoice'
    const amount = r.invoices?.amount_due ? fmtINR(r.invoices.amount_due) : 'the due amount'
    const days = r.days_overdue || 7

    const message = `Namaste ${clientName} garu, this is a reminder from ${businessName} regarding Invoice #${invNum} for ${amount}, which is overdue by ${days} days. Please click to review and make payment at your earliest convenience. Thank you!`

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .rl-root{display:flex;min-height:100vh}
        .rl-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        .rl-top{background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .rl-top-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .rl-top-sub{font-size:11px;color:rgba(26,20,13,.38);margin-top:2px}

        .rl-content{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:16px}

        /* Metrics */
        .rl-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .rl-stat{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;padding:14px 16px}
        .rl-stat-label{font-size:10px;font-weight:500;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .rl-stat-val{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1A140D;letter-spacing:-.02em;line-height:1}

        /* Control Bar */
        .rl-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .rl-tabs{display:flex;background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:10px;padding:3px;gap:2px}
        .rl-tab{padding:6px 14px;font-size:11px;font-weight:600;color:rgba(26,20,13,.50);cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;border-radius:7px;transition:all .15s}
        .rl-tab:hover{color:#1A140D}
        .rl-tab.active{background:white;color:#1B5E3B;box-shadow:0 1px 4px rgba(26,20,13,.08)}

        .rl-search{background:white;border:.5px solid rgba(26,20,13,.12);border-radius:8px;padding:7px 12px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;width:240px;transition:border-color .18s}
        .rl-search:focus{border-color:#2D8A58}

        /* Card Container */
        .rl-card{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:14px;overflow:hidden}

        /* Table */
        .rl-table{width:100%;border-collapse:collapse}
        .rl-th{font-size:9px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.07em;padding:12px 16px;text-align:left;border-bottom:1px solid rgba(26,20,13,.08);background:#FAF7F2}
        .rl-td{padding:12px 16px;border-bottom:.5px solid rgba(26,20,13,.05);font-size:12px;color:#1A140D;vertical-align:middle}
        .rl-tr:last-child .rl-td{border-bottom:none}
        .rl-tr{transition:background .12s}
        .rl-tr:hover{background:rgba(26,20,13,.02)}

        .rl-client-name{font-weight:600;color:#1A140D}
        .rl-client-sub{font-size:10px;color:rgba(26,20,13,.40);margin-top:2px}
        .rl-inv-num{font-weight:600;color:#1B5E3B;cursor:pointer}
        .rl-inv-num:hover{text-decoration:underline}

        .rl-badge{font-size:9px;font-weight:600;padding:2px 8px;border-radius:100px;display:inline-flex;align-items:center;gap:4px;width:fit-content}
        .rl-badge-dot{width:4px;height:4px;border-radius:50%;flex-shrink:0}

        .rl-wa-btn{background:#25D366;border:none;border-radius:6px;padding:5px 10px;font-size:10px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;text-decoration:none;transition:opacity .15s}
        .rl-wa-btn:hover{opacity:.9}

        .rl-empty{text-align:center;padding:48px 20px}
        .rl-empty-icon{font-size:36px;margin-bottom:12px}
        .rl-empty-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;margin-bottom:6px}
        .rl-empty-sub{font-size:12px;color:rgba(26,20,13,.45)}

        @media(max-width:900px){
          .rl-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .rl-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .rl-content{padding:16px}
          .rl-stats{grid-template-columns:1fr 1fr}
          .rl-controls{flex-direction:column; align-items:stretch}
          .rl-tabs{overflow-x:auto}
          .rl-tab{white-space:nowrap}
          .rl-search{width:100%}
          .rl-card{overflow-x:auto}
          .rl-table{min-width:600px}
        }
        @media(max-width:600px){
          .rl-stats{grid-template-columns:1fr}
        }
      `}</style>

      <div className="rl-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="rl-main">
          {/* Topbar */}
          <div className="rl-top">
            <div>
              <div className="rl-top-title">Reminders Sent Log</div>
              <div className="rl-top-sub">Full audit trail of automated & manual WhatsApp payment follow-ups</div>
            </div>
          </div>

          <div className="rl-content">
            {/* Stats */}
            <div className="rl-stats">
              <div className="rl-stat">
                <div className="rl-stat-label">Total Sent</div>
                <div className="rl-stat-val" style={{ color: '#1B5E3B' }}>{totalSent}</div>
              </div>
              <div className="rl-stat">
                <div className="rl-stat-label">Scheduled</div>
                <div className="rl-stat-val" style={{ color: '#185FA5' }}>{totalScheduled}</div>
              </div>
              <div className="rl-stat">
                <div className="rl-stat-label">Skipped</div>
                <div className="rl-stat-val" style={{ color: 'rgba(26,20,13,.40)' }}>{totalSkipped}</div>
              </div>
              <div className="rl-stat">
                <div className="rl-stat-label">Recovered Value</div>
                <div className="rl-stat-val">{fmtINR(totalAmountRecovered)}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="rl-controls">
              <div className="rl-tabs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'sent', label: 'Sent' },
                  { id: 'scheduled', label: 'Scheduled' },
                  { id: 'skipped', label: 'Skipped' },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`rl-tab ${filter === t.id ? 'active' : ''}`}
                    onClick={() => setFilter(t.id as typeof filter)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <input
                className="rl-search"
                placeholder="Search client or invoice #..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Data Table */}
            <div className="rl-card">
              {filteredReminders.length === 0 ? (
                <div className="rl-empty">
                  <div className="rl-empty-icon">📋</div>
                  <div className="rl-empty-title">No reminder logs found</div>
                  <div className="rl-empty-sub">
                    {search ? 'Try adjusting your search query.' : 'Reminders automatically record here when sent or scheduled for overdue invoices.'}
                  </div>
                </div>
              ) : (
                <table className="rl-table">
                  <thead>
                    <tr>
                      <th className="rl-th">Client</th>
                      <th className="rl-th">Invoice</th>
                      <th className="rl-th">Overdue</th>
                      <th className="rl-th">Channel</th>
                      <th className="rl-th">Status</th>
                      <th className="rl-th">Time</th>
                      <th className="rl-th" style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReminders.map(r => {
                      const cfg = STATUS_CFG[r.status] || STATUS_CFG.skipped
                      const client = r.invoices?.clients
                      const inv = r.invoices
                      return (
                        <tr key={r.id} className="rl-tr">
                          <td className="rl-td">
                            <div className="rl-client-name">{client?.name || 'Unknown Client'}</div>
                            {client?.company_name && <div className="rl-client-sub">{client.company_name}</div>}
                          </td>
                          <td className="rl-td">
                            {inv ? (
                              <span className="rl-inv-num" onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>
                                {inv.invoice_number}
                              </span>
                            ) : '—'}
                            {inv?.total_amount && (
                              <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)' }}>{fmtINR(inv.total_amount)}</div>
                            )}
                          </td>
                          <td className="rl-td">
                            <span style={{ fontWeight: 600, color: r.days_overdue && r.days_overdue >= 14 ? '#C0392B' : '#E8692A' }}>
                              Day {r.days_overdue || 0}
                            </span>
                            {r.used_contract_context && (
                              <div style={{ fontSize: 9, color: '#1B5E3B', fontWeight: 500, marginTop: 1 }}>Contract clause</div>
                            )}
                          </td>
                          <td className="rl-td">
                            <span style={{ fontSize: 11, fontWeight: 500 }}>
                              💬 {r.channel.toUpperCase()}
                            </span>
                          </td>
                          <td className="rl-td">
                            <div className="rl-badge" style={{ background: cfg.bg, color: cfg.color }}>
                              <div className="rl-badge-dot" style={{ background: cfg.dot }} />
                              {cfg.label}
                            </div>
                          </td>
                          <td className="rl-td" style={{ fontSize: 11, color: 'rgba(26,20,13,.50)' }}>
                            {r.sent_at ? fmtDateTime(r.sent_at) : r.scheduled_at ? `Sch: ${fmtDate(r.scheduled_at)}` : '—'}
                          </td>
                          <td className="rl-td" style={{ textAlign: 'right' }}>
                            <a
                              className="rl-wa-btn"
                              href={getWhatsAppLink(r)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span>Send Now</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                              </svg>
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
