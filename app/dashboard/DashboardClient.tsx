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
  paid:           { label: 'Paid',      bg: 'rgba(16, 185, 129, 0.15)',  color: '#34D399' },
  overdue:        { label: 'Overdue',   bg: 'rgba(248, 113, 113, 0.15)', color: '#F87171' },
  sent:           { label: 'Sent',      bg: 'rgba(59, 130, 246, 0.15)',  color: '#60A5FA' },
  draft:          { label: 'Draft',     bg: 'rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.6)' },
  partially_paid: { label: 'Part paid', bg: 'rgba(245, 158, 11, 0.15)',  color: '#FBBF24' },
}

export default function DashboardClient({
  userName, userEmail, greeting, dateStr,
  metrics, invoices, recentActivity,
}: Props) {
  const router = useRouter()

  const activeInvoiceCount = invoices.filter(i => !['paid','cancelled'].includes(i.status)).length

  return (
    <>
      <style>{`
        .kd-root { display: flex; min-height: 100vh; background-color: #080E0A; color: #F3F4F6; }
        .kd-main { flex: 1; margin-left: 220px; display: flex; flex-direction: column; min-height: 100vh; }

        /* Topbar Header */
        .kd-top {
          background: rgba(12, 22, 15, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 18px 32px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 40;
        }

        .kd-greeting { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -.02em; }
        .kd-date { font-size: 11px; color: rgba(255, 255, 255, 0.45); margin-top: 2px; font-weight: 500; }

        .kd-actions { display: flex; gap: 10px; align-items: center; }

        /* Content Area */
        .kd-content { flex: 1; padding: 28px 32px; display: flex; flex-direction: column; gap: 24px; max-width: 1440px; width: 100%; margin: 0 auto; }

        /* Kokonut Stat Grid */
        .kd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

        .kd-stat-card {
          background: rgba(18, 30, 22, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px; padding: 20px;
          display: flex; flex-direction: column;
          position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }
        .kd-stat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(16, 185, 129, 0.35);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px 0 rgba(16, 185, 129, 0.15);
        }

        .kd-stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .kd-stat-label { font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: .08em; }
        .kd-stat-icon { width: 32px; height: 32px; border-radius: 9px; background: rgba(16, 185, 129, 0.12); color: #34D399; display: flex; align-items: center; justify-content: center; font-size: 14px; }

        .kd-stat-val { font-family: 'Lora', serif; font-size: 28px; font-weight: 700; color: #FFFFFF; letter-spacing: -.02em; line-height: 1; margin-bottom: 6px; }
        .kd-stat-sub { font-size: 11px; font-weight: 500; color: rgba(255, 255, 255, 0.5); display: flex; align-items: center; gap: 6px; }

        /* Quick Launch Pad Banner */
        .kd-banner {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 20px; padding: 22px 28px;
          display: flex; align-items: center; justify-content: space-between;
          backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.08);
        }
        .kd-banner-title { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: #FFFFFF; }
        .kd-banner-sub { font-size: 13px; color: rgba(255, 255, 255, 0.6); margin-top: 4px; }

        /* Split Workspace Grid */
        .kd-grid { display: grid; grid-template-columns: 1fr 340px; gap: 20px; }

        .kd-card {
          background: rgba(18, 30, 22, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px; overflow: hidden;
        }

        .kd-card-hdr {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .kd-card-title { font-size: 14px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 8px; }
        .kd-card-action { font-size: 11px; font-weight: 600; color: #34D399; cursor: pointer; background: none; border: none; font-family: 'Outfit', sans-serif; }
        .kd-card-action:hover { text-decoration: underline; }

        /* Invoice Table / List */
        .kd-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.2s; cursor: pointer;
        }
        .kd-row:hover { background: rgba(255, 255, 255, 0.04); }

        .kd-avatar {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(16, 185, 129, 0.15); color: #34D399;
          font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .kd-inv-num { font-size: 13px; font-weight: 700; color: #FFFFFF; }
        .kd-inv-client { font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 2px; }

        .kd-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 100px; }

        @media(max-width:1024px){
          .kd-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .kd-top{padding:14px 16px; flex-wrap:wrap; gap:12px; position:static}
          .kd-content{padding:16px; gap:16px}
          .kd-banner{flex-direction:column; align-items:flex-start; gap:14px; padding:18px}
          .kd-stats-grid{grid-template-columns:1fr 1fr}
          .kd-grid{grid-template-columns:1fr}
        }
        @media(max-width:640px){
          .kd-stats-grid{grid-template-columns:1fr}
          .kd-actions{width:100%; display:flex; flex-direction:column; gap:8px}
          .kd-actions button{width:100%; justify-content:center}
          .kd-banner button{width:100%; justify-content:center}
        }
      `}</style>

      <div className="kd-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="kd-main">
          {/* Topbar Header */}
          <div className="kd-top">
            <div>
              <div className="kd-greeting">{greeting}, {userName}!</div>
              <div className="kd-date">{dateStr} · Settlr MSME Operating System</div>
            </div>

            <div className="kd-actions">
              <button className="kokonut-btn-secondary" onClick={() => router.push('/dashboard/contracts')}>
                🛡️ Contracts AI
              </button>
              <button className="kokonut-btn-secondary" onClick={() => router.push('/dashboard/gst')}>
                🧾 GST & Tax Hub
              </button>
              <button className="kokonut-btn-primary" onClick={() => router.push('/dashboard/invoices/new')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Create Invoice
              </button>
            </div>
          </div>

          <div className="kd-content">
            {/* Kokonut Motion Stat Cards */}
            <div className="kd-stats-grid">
              <div className="kd-stat-card">
                <div className="kd-stat-header">
                  <span className="kd-stat-label">Total Receivable</span>
                  <span className="kd-stat-icon">💰</span>
                </div>
                <div className="kd-stat-val">{fmtINR(metrics.totalReceivable)}</div>
                <div className="kd-stat-sub">
                  <span className="kokonut-dot" /> {activeInvoiceCount} active invoices
                </div>
              </div>

              <div className="kd-stat-card">
                <div className="kd-stat-header">
                  <span className="kd-stat-label">Overdue Balance</span>
                  <span className="kd-stat-icon" style={{ background: 'rgba(248, 113, 113, 0.15)', color: '#F87171' }}>⚠️</span>
                </div>
                <div className="kd-stat-val" style={{ color: metrics.overdueAmount > 0 ? '#F87171' : '#FFFFFF' }}>
                  {fmtINR(metrics.overdueAmount)}
                </div>
                <div className="kd-stat-sub">
                  {metrics.overdueAmount > 0 ? '🔴 Requires WhatsApp Follow-up' : '🟢 All payments on time'}
                </div>
              </div>

              <div className="kd-stat-card">
                <div className="kd-stat-header">
                  <span className="kd-stat-label">Collected This Month</span>
                  <span className="kd-stat-icon">✅</span>
                </div>
                <div className="kd-stat-val" style={{ color: '#34D399' }}>{fmtINR(metrics.collectedThisMonth)}</div>
                <div className="kd-stat-sub">Via Bank Transfer & UPI</div>
              </div>

              <div className="kd-stat-card">
                <div className="kd-stat-header">
                  <span className="kd-stat-label">Reminders Dispatched</span>
                  <span className="kd-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>💬</span>
                </div>
                <div className="kd-stat-val">{metrics.remindersSent}</div>
                <div className="kd-stat-sub">Automated WhatsApp logs</div>
              </div>
            </div>

            {/* Quick Launch Banner */}
            <div className="kd-banner">
              <div>
                <div className="kd-banner-title">✨ MSME Operating System · Quick Workflows</div>
                <div className="kd-banner-sub">
                  Create client proposals, track expenses for GST ITC, run recurring retainers, or analyze legal contract risks.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="kokonut-btn-secondary" onClick={() => router.push('/dashboard/proposals')}>
                  📝 Proposals
                </button>
                <button className="kokonut-btn-secondary" onClick={() => router.push('/dashboard/expenses')}>
                  💸 Expenses
                </button>
                <button className="kokonut-btn-secondary" onClick={() => router.push('/dashboard/invoices/recurring')}>
                  🔁 Retainers
                </button>
                <button className="kokonut-btn-secondary" onClick={() => router.push('/dashboard/reports')}>
                  📊 Reports
                </button>
                <button className="kokonut-btn-primary" onClick={() => router.push('/dashboard/gst')}>
                  Calculate GST
                </button>
              </div>
            </div>

            {/* Main Split Grid */}
            <div className="kd-grid">
              {/* Recent Invoices */}
              <div className="kd-card">
                <div className="kd-card-hdr">
                  <div className="kd-card-title">📄 Recent Invoices</div>
                  <button className="kd-card-action" onClick={() => router.push('/dashboard/invoices')}>View All Invoices →</button>
                </div>

                {invoices.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    No invoices created yet. Click "Create Invoice" to issue your first GST bill!
                  </div>
                ) : (
                  <div>
                    {invoices.map(inv => {
                      const st = STATUS_CONFIG[inv.status] || STATUS_CONFIG.sent
                      const clientName = inv.clients?.[0]?.name || 'Client'
                      return (
                        <div key={inv.id} className="kd-row" onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>
                          <div className="kd-avatar">{clientName.charAt(0)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="kd-inv-num">{inv.invoice_number}</div>
                            <div className="kd-inv-client">{clientName}</div>
                          </div>
                          <span className="kd-badge" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', minWidth: 80, textAlign: 'right' }}>
                            {fmtINR(inv.amount_due || inv.total_amount)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Activity Feed */}
              <div className="kd-card">
                <div className="kd-card-hdr">
                  <div className="kd-card-title">💬 Reminders Activity</div>
                  <button className="kd-card-action" onClick={() => router.push('/dashboard/reminders/log')}>View Log →</button>
                </div>

                {recentActivity.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    No WhatsApp reminders sent recently.
                  </div>
                ) : (
                  <div>
                    {recentActivity.map(act => (
                      <div key={act.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 14 }}>💬</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF' }}>
                            {act.invoices?.[0]?.clients?.[0]?.name || 'Client'}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            {act.invoices?.[0]?.invoice_number} · Sent {timeAgo(act.sent_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}