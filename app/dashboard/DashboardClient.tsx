'use client'

import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────
interface Metrics {
  totalReceivable:    number
  overdueAmount:      number
  collectedThisMonth: number
  remindersSent:      number
}

interface Invoice {
  id: string
  invoice_number: string
  total_amount: number
  amount_due: number
  status: string
  due_date: string
  issue_date: string
  clients: { name: string }[] | null
}

interface Activity {
  id: string
  channel: string
  status: string
  sent_at: string
  days_overdue: number | null
  invoices: { invoice_number: string; clients: { name: string }[] | null }[] | null
}

interface Props {
  userName:       string
  userEmail:      string
  greeting:       string
  dateStr:        string
  metrics:        Metrics
  invoices:       Invoice[]
  recentActivity: Activity[]
}

// ── Helpers ────────────────────────────────────────────────
function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1).replace(/\.?0+$/, '')}K`
  return `₹${Math.round(n)}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  paid:           { label: 'Paid',      bg: '#E1F5EE', color: '#085041' },
  overdue:        { label: 'Overdue',   bg: '#FCEBEB', color: '#791F1F' },
  sent:           { label: 'Sent',      bg: '#E6F1FB', color: '#0C447C' },
  draft:          { label: 'Draft',     bg: '#F1EFE8', color: '#444441' },
  partially_paid: { label: 'Part paid', bg: '#FAEEDA', color: '#633806' },
}

const CLIENT_COLORS = [
  '#1B5E3B', '#185FA5', '#854F0B', '#7C3AED',
  '#C85A1A', '#0F5E73', '#6B21A8', '#0F766E',
]

function clientColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CLIENT_COLORS[Math.abs(hash) % CLIENT_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

// ── Component ──────────────────────────────────────────────
export default function DashboardClient({
  userName, userEmail, greeting, dateStr,
  metrics, invoices, recentActivity,
}: Props) {
  const router = useRouter()

  const metricCards = [
    {
      label:   'Total receivable',
      value:   fmtINR(metrics.totalReceivable),
      sub:     `${invoices.filter(i => !['paid','cancelled'].includes(i.status)).length} active invoices`,
      subColor: '#BA7517',
    },
    {
      label:   'Overdue',
      value:   fmtINR(metrics.overdueAmount),
      sub:     metrics.overdueAmount > 0 ? 'Needs attention' : 'All on track',
      subColor: metrics.overdueAmount > 0 ? '#A32D2D' : '#085041',
    },
    {
      label:   'Collected this month',
      value:   fmtINR(metrics.collectedThisMonth),
      sub:     'Via UPI + bank transfer',
      subColor: '#085041',
    },
    {
      label:   'Reminders sent',
      value:   String(metrics.remindersSent),
      sub:     'This month',
      subColor: '#0C447C',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #F7F5F0; font-family: 'DM Sans', sans-serif; }

        /* ── LAYOUT ── */
        .vsl-dash { display: flex; min-height: 100vh; }
        .vsl-main { flex: 1; margin-left: 200px; display: flex; flex-direction: column; min-height: 100vh; }

        /* ── TOPBAR ── */
        .vsl-top {
          background: #FDFAF5;
          border-bottom: .5px solid rgba(26,20,13,.08);
          padding: 14px 28px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 40;
          flex-shrink: 0;
        }

        .vsl-top-title  { font-family: 'Lora', serif; font-size: 18px; font-weight: 700; color: #1A140D; letter-spacing: -.02em; line-height: 1; }
        .vsl-top-sub    { font-size: 11px; color: rgba(26,20,13,.38); margin-top: 2px; }

        .vsl-top-actions { display: flex; gap: 8px; align-items: center; }

        .vsl-btn-primary {
          background: #1B5E3B; border: none; border-radius: 8px;
          padding: 8px 16px; font-size: 12px; font-weight: 600; color: white;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: all .18s; font-family: 'DM Sans', sans-serif;
          box-shadow: 0 2px 8px rgba(27,94,59,.25);
        }
        .vsl-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(27,94,59,.32); }

        .vsl-btn-sec {
          background: white; border: .5px solid rgba(26,20,13,.12);
          border-radius: 8px; padding: 8px 14px;
          font-size: 12px; font-weight: 500; color: rgba(26,20,13,.60);
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all .15s;
        }
        .vsl-btn-sec:hover { border-color: rgba(26,20,13,.22); color: #1A140D; }

        /* ── CONTENT ── */
        .vsl-content { flex: 1; padding: 24px 28px; }

        /* ── METRICS ── */
        .vsl-metrics {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 10px; margin-bottom: 20px;
        }

        .vsl-met {
          background: #FDFAF5;
          border: .5px solid rgba(26,20,13,.08);
          border-radius: 10px; padding: 14px 16px;
          transition: box-shadow .18s;
        }
        .vsl-met:hover { box-shadow: 0 4px 16px rgba(26,20,13,.07); }

        .vsl-met-label  { font-size: 10px; font-weight: 500; color: rgba(26,20,13,.40); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
        .vsl-met-value  { font-family: 'Lora', serif; font-size: 22px; font-weight: 700; color: #1A140D; letter-spacing: -.02em; line-height: 1; margin-bottom: 5px; }
        .vsl-met-sub    { font-size: 10px; font-weight: 500; }

        /* ── BODY GRID ── */
        .vsl-body { display: grid; grid-template-columns: 1fr 220px; gap: 10px; }

        /* ── CARD ── */
        .vsl-card {
          background: #FDFAF5;
          border: .5px solid rgba(26,20,13,.08);
          border-radius: 10px; overflow: hidden;
        }

        .vsl-card-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px;
          border-bottom: .5px solid rgba(26,20,13,.06);
        }

        .vsl-card-title { font-size: 12px; font-weight: 600; color: #1A140D; }
        .vsl-card-action { font-size: 10px; font-weight: 500; color: #1B5E3B; cursor: pointer; background: none; border: none; font-family: 'DM Sans', sans-serif; }
        .vsl-card-action:hover { text-decoration: underline; }

        /* ── INVOICE ROWS ── */
        .vsl-inv-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          border-bottom: .5px solid rgba(26,20,13,.04);
          transition: background .15s; cursor: pointer;
        }
        .vsl-inv-row:last-child { border-bottom: none; }
        .vsl-inv-row:hover { background: rgba(26,20,13,.02); }

        .vsl-inv-av {
          width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: white; flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }

        .vsl-inv-name { font-size: 12px; font-weight: 500; color: #1A140D; line-height: 1; margin-bottom: 2px; }
        .vsl-inv-num  { font-size: 10px; color: rgba(26,20,13,.38); }
        .vsl-inv-date { font-size: 9px; color: rgba(26,20,13,.35); margin-left: auto; flex-shrink: 0; }
        .vsl-inv-amt  { font-size: 12px; font-weight: 600; color: #1A140D; min-width: 70px; text-align: right; flex-shrink: 0; }

        .vsl-badge {
          font-size: 9px; font-weight: 600;
          padding: 2px 7px; border-radius: 100px;
          flex-shrink: 0;
        }

        /* ── EMPTY STATE ── */
        .vsl-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 40px 20px; gap: 10px;
          text-align: center;
        }

        .vsl-empty-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(27,94,59,.08);
          display: flex; align-items: center; justify-content: center;
        }

        .vsl-empty-title { font-size: 13px; font-weight: 500; color: #1A140D; }
        .vsl-empty-sub   { font-size: 11px; color: rgba(26,20,13,.45); line-height: 1.5; }
        .vsl-empty-btn   {
          background: #1B5E3B; border: none; border-radius: 7px;
          padding: 7px 16px; font-size: 11px; font-weight: 600; color: white;
          cursor: pointer; font-family: 'DM Sans', sans-serif; margin-top: 4px;
        }

        /* ── ACTIVITY ── */
        .vsl-act-row {
          display: flex; align-items: flex-start; gap: 9px;
          padding: 9px 14px;
          border-bottom: .5px solid rgba(26,20,13,.04);
        }
        .vsl-act-row:last-child { border-bottom: none; }

        .vsl-act-dot {
          width: 7px; height: 7px; border-radius: 50%;
          flex-shrink: 0; margin-top: 3px;
        }

        .vsl-act-text { font-size: 10px; color: rgba(26,20,13,.65); line-height: 1.45; flex: 1; }
        .vsl-act-time { font-size: 9px; color: rgba(26,20,13,.32); flex-shrink: 0; white-space: nowrap; }

        /* ── QUICK ACTIONS ── */
        .vsl-quick {
          background: #FDFAF5;
          border: .5px solid rgba(26,20,13,.08);
          border-radius: 10px; padding: 14px;
          margin-top: 10px;
        }

        .vsl-quick-title { font-size: 11px; font-weight: 600; color: #1A140D; margin-bottom: 10px; }

        .vsl-qa-btn {
          width: 100%; display: flex; align-items: center; gap: 8px;
          background: white; border: .5px solid rgba(26,20,13,.10);
          border-radius: 8px; padding: 9px 10px; cursor: pointer;
          transition: all .15s; margin-bottom: 5px;
          font-family: 'DM Sans', sans-serif; text-decoration: none;
        }
        .vsl-qa-btn:last-child { margin-bottom: 0; }
        .vsl-qa-btn:hover { border-color: rgba(27,94,59,.30); background: rgba(27,94,59,.03); }

        .vsl-qa-icon {
          width: 24px; height: 24px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .vsl-qa-label { font-size: 11px; font-weight: 500; color: #1A140D; }
        .vsl-qa-sub   { font-size: 9px; color: rgba(26,20,13,.40); margin-top: 1px; }

        @media (max-width: 900px) {
          .vsl-main { margin-left: 0; }
          .vsl-metrics { grid-template-columns: repeat(2,1fr); }
          .vsl-body { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="vsl-dash">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="vsl-main">

          {/* Topbar */}
          <div className="vsl-top">
            <div>
              <div className="vsl-top-title">{greeting}, {userName.split(' ')[0]}</div>
              <div className="vsl-top-sub">{dateStr}</div>
            </div>
            <div className="vsl-top-actions">
              <button className="vsl-btn-sec" onClick={() => router.push('/dashboard/contracts')}>
                Upload contract
              </button>
              <button className="vsl-btn-primary" onClick={() => router.push('/dashboard/invoices/new')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New invoice
              </button>
            </div>
          </div>

          <div className="vsl-content">

            {/* Metric cards */}
            <div className="vsl-metrics">
              {metricCards.map(m => (
                <div className="vsl-met" key={m.label}>
                  <div className="vsl-met-label">{m.label}</div>
                  <div className="vsl-met-value">{m.value}</div>
                  <div className="vsl-met-sub" style={{ color: m.subColor }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Body grid */}
            <div className="vsl-body">

              {/* Invoice list */}
              <div className="vsl-card">
                <div className="vsl-card-hdr">
                  <span className="vsl-card-title">Recent invoices</span>
                  <button className="vsl-card-action" onClick={() => router.push('/dashboard/invoices')}>
                    View all →
                  </button>
                </div>

                {invoices.length === 0 ? (
                  <div className="vsl-empty">
                    <div className="vsl-empty-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B5E3B" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div className="vsl-empty-title">No invoices yet</div>
                    <div className="vsl-empty-sub">Create your first invoice and start tracking payments.</div>
                    <button className="vsl-empty-btn" onClick={() => router.push('/dashboard/invoices/new')}>
                      Create invoice
                    </button>
                  </div>
                ) : (
                  invoices.slice(0, 6).map(inv => {
                    const clientName = inv.clients?.[0]?.name || 'Unknown'
                    const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
                    const dueDate = new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

                    return (
                      <div
                        key={inv.id}
                        className="vsl-inv-row"
                        onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                      >
                        <div
                          className="vsl-inv-av"
                          style={{ background: clientColor(clientName) }}
                        >
                          {initials(clientName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="vsl-inv-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {clientName}
                          </div>
                          <div className="vsl-inv-num">{inv.invoice_number}</div>
                        </div>
                        <div className="vsl-inv-date">Due {dueDate}</div>
                        <div className="vsl-inv-amt">{fmtINR(inv.total_amount)}</div>
                        <span
                          className="vsl-badge"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Right column */}
              <div>
                {/* Activity */}
                <div className="vsl-card">
                  <div className="vsl-card-hdr">
                    <span className="vsl-card-title">Activity</span>
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="vsl-empty" style={{ padding: '24px 16px' }}>
                      <div className="vsl-empty-sub">No activity yet. Send your first invoice to get started.</div>
                    </div>
                  ) : (
                    recentActivity.map(a => {
                      const invName = a.invoices?.[0]?.clients?.[0]?.name || a.invoices?.[0]?.invoice_number || 'Invoice'
                      const isPayment = a.channel === 'payment'
                      const dotColor = isPayment ? '#1B5E3B' : a.days_overdue && a.days_overdue > 14 ? '#C0392B' : '#E8692A'
                      const text = isPayment
                        ? `${invName} — payment received`
                        : `Reminder sent to ${invName}`

                      return (
                        <div key={a.id} className="vsl-act-row">
                          <div className="vsl-act-dot" style={{ background: dotColor }} />
                          <div className="vsl-act-text">{text}</div>
                          <div className="vsl-act-time">{timeAgo(a.sent_at)}</div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Quick actions */}
                <div className="vsl-quick">
                  <div className="vsl-quick-title">Quick actions</div>

                  {[
                    {
                      icon: '📄', bg: 'rgba(27,94,59,.09)',
                      label: 'New invoice',
                      sub: 'Create & send',
                      path: '/dashboard/invoices/new',
                    },
                    {
                      icon: '🤝', bg: 'rgba(24,95,165,.09)',
                      label: 'Add client',
                      sub: 'Save contact',
                      path: '/dashboard/clients/new',
                    },
                    {
                      icon: '📋', bg: 'rgba(133,79,11,.09)',
                      label: 'Upload contract',
                      sub: 'AI will read it',
                      path: '/dashboard/contracts',
                    },
                  ].map(qa => (
                    <a key={qa.path} href={qa.path} className="vsl-qa-btn">
                      <div className="vsl-qa-icon" style={{ background: qa.bg }}>
                        <span style={{ fontSize: 14 }}>{qa.icon}</span>
                      </div>
                      <div>
                        <div className="vsl-qa-label">{qa.label}</div>
                        <div className="vsl-qa-sub">{qa.sub}</div>
                      </div>
                      <svg style={{ marginLeft: 'auto', opacity: .35 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1A140D" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}