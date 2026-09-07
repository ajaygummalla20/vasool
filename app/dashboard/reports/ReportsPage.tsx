'use client'

import { useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'

interface Invoice { id: string; invoice_number: string; status: string; total_amount: number; amount_due: number; issue_date: string; due_date: string; paid_at: string | null; clients: { name: string }[] | null }
interface Payment { id: string; amount: number; method: string; paid_at: string }
interface Expense { id: string; amount: number; category: string; expense_date: string; gst_amount: number }
interface Props { invoices: Invoice[]; payments: Payment[]; expenses: Expense[]; userName: string; userEmail: string }

function fmtINR(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) }

export default function ReportsPage({ invoices, payments, expenses, userName, userEmail }: Props) {
  const [tab, setTab] = useState<'revenue' | 'clients' | 'aging' | 'pnl'>('revenue')

  // Revenue metrics
  const totalRevenue = useMemo(() => invoices.reduce((s, i) => s + Number(i.total_amount), 0), [invoices])
  const totalCollected = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments])
  const totalOutstanding = useMemo(() => invoices.filter(i => !['paid', 'cancelled'].includes(i.status)).reduce((s, i) => s + Number(i.amount_due || 0), 0), [invoices])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses])
  const netProfit = totalCollected - totalExpenses

  // Monthly revenue (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months: { label: string; invoiced: number; collected: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const m = d.getMonth(); const y = d.getFullYear()
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      const invoiced = invoices.filter(inv => { const id = new Date(inv.issue_date); return id.getMonth() === m && id.getFullYear() === y }).reduce((s, inv) => s + Number(inv.total_amount), 0)
      const collected = payments.filter(p => { const pd = new Date(p.paid_at); return pd.getMonth() === m && pd.getFullYear() === y }).reduce((s, p) => s + Number(p.amount), 0)
      const exp = expenses.filter(e => { const ed = new Date(e.expense_date); return ed.getMonth() === m && ed.getFullYear() === y }).reduce((s, e) => s + Number(e.amount), 0)
      months.push({ label, invoiced, collected, expenses: exp })
    }
    return months
  }, [invoices, payments, expenses])

  const maxMonthly = Math.max(...monthlyRevenue.map(m => Math.max(m.invoiced, m.collected, m.expenses)), 1)

  // Client breakdown
  const clientBreakdown = useMemo(() => {
    const map: Record<string, { name: string; total: number; paid: number; count: number }> = {}
    invoices.forEach(inv => {
      const name = inv.clients?.[0]?.name || 'Unknown'
      if (!map[name]) map[name] = { name, total: 0, paid: 0, count: 0 }
      map[name].total += Number(inv.total_amount)
      map[name].count++
      if (inv.status === 'paid') map[name].paid += Number(inv.total_amount)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [invoices])

  // Aging buckets
  const agingBuckets = useMemo(() => {
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const now = Date.now()
    invoices.filter(i => ['sent', 'overdue', 'partially_paid'].includes(i.status)).forEach(inv => {
      const days = Math.floor((now - new Date(inv.due_date).getTime()) / 86400000)
      if (days <= 30) buckets['0-30'] += Number(inv.amount_due || 0)
      else if (days <= 60) buckets['31-60'] += Number(inv.amount_due || 0)
      else if (days <= 90) buckets['61-90'] += Number(inv.amount_due || 0)
      else buckets['90+'] += Number(inv.amount_due || 0)
    })
    return buckets
  }, [invoices])

  const maxAging = Math.max(...Object.values(agingBuckets), 1)

  return (
    <>
      <style>{`
        .rp-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .rp-main{flex:1;margin-left:220px;display:flex;flex-direction:column}
        .rp-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .rp-title{font-size:22px;font-weight:800;color:#FFF}
        .rp-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .rp-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:20px;max-width:1440px;width:100%;margin:0 auto}

        .rp-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
        .rp-stat{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .rp-stat:hover{transform:translateY(-2px);border-color:rgba(16,185,129,.3)}
        .rp-stat-label{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .rp-stat-val{font-size:22px;font-weight:800;letter-spacing:-.02em}

        .rp-tabs{display:flex;gap:6px;background:rgba(18,30,22,.5);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:4px}
        .rp-tab{flex:1;padding:10px;font-size:12px;font-weight:600;border-radius:10px;border:none;background:none;color:rgba(255,255,255,.5);cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s;text-align:center}
        .rp-tab.active{background:rgba(16,185,129,.15);color:#34D399;box-shadow:0 2px 10px rgba(16,185,129,.1)}

        .rp-panel{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:24px;min-height:300px}
        .rp-section-title{font-size:14px;font-weight:700;color:#FFF;margin-bottom:16px}

        .rp-chart{display:flex;align-items:flex-end;gap:12px;height:200px;padding:0 8px}
        .rp-bar-group{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
        .rp-bars{display:flex;gap:3px;align-items:flex-end;height:160px;width:100%}
        .rp-bar{flex:1;border-radius:4px 4px 0 0;min-height:2px;transition:height .5s cubic-bezier(.16,1,.3,1)}
        .rp-bar-label{font-size:9px;color:rgba(255,255,255,.5);font-weight:600}

        .rp-legend{display:flex;gap:16px;margin-top:12px;justify-content:center}
        .rp-legend-item{display:flex;align-items:center;gap:6px;font-size:10px;color:rgba(255,255,255,.6)}
        .rp-legend-dot{width:8px;height:8px;border-radius:3px}

        .rp-table{width:100%;border-collapse:collapse}
        .rp-th{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.06)}
        .rp-td{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.04);font-size:12px}

        .rp-aging-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .rp-aging-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;text-align:center}
        .rp-aging-label{font-size:11px;font-weight:700;color:rgba(255,255,255,.5);margin-bottom:8px}
        .rp-aging-val{font-size:20px;font-weight:800}
        .rp-aging-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);margin-top:10px;overflow:hidden}
        .rp-aging-fill{height:100%;border-radius:3px;transition:width .5s}

        @media(max-width:1024px){
          .rp-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .rp-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .rp-content{padding:16px}
          .rp-stats{grid-template-columns:repeat(2,1fr)}
          .rp-tabs{overflow-x:auto}
          .rp-tab{white-space:nowrap; min-width:120px}
          .rp-panel{overflow-x:auto; padding:16px}
          .rp-table{min-width:500px}
          .rp-aging-grid{grid-template-columns:1fr 1fr}
        }
        @media(max-width:600px){
          .rp-stats{grid-template-columns:1fr}
          .rp-aging-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="rp-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="rp-main">
          <div className="rp-top">
            <div>
              <div className="rp-title">Revenue Reports & Analytics</div>
              <div className="rp-sub">Business performance insights, P&L, and overdue aging analysis</div>
            </div>
          </div>

          <div className="rp-content">
            {/* Top Stats */}
            <div className="rp-stats">
              <div className="rp-stat">
                <div className="rp-stat-label">Total Invoiced</div>
                <div className="rp-stat-val" style={{ color: '#FFF' }}>{fmtINR(totalRevenue)}</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Collected</div>
                <div className="rp-stat-val" style={{ color: '#34D399' }}>{fmtINR(totalCollected)}</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Outstanding</div>
                <div className="rp-stat-val" style={{ color: '#FBBF24' }}>{fmtINR(totalOutstanding)}</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Total Expenses</div>
                <div className="rp-stat-val" style={{ color: '#F87171' }}>{fmtINR(totalExpenses)}</div>
              </div>
              <div className="rp-stat">
                <div className="rp-stat-label">Net Profit</div>
                <div className="rp-stat-val" style={{ color: netProfit >= 0 ? '#34D399' : '#F87171' }}>{fmtINR(netProfit)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="rp-tabs">
              <button className={`rp-tab ${tab === 'revenue' ? 'active' : ''}`} onClick={() => setTab('revenue')}>💰 Revenue Trend</button>
              <button className={`rp-tab ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>👥 Client Breakdown</button>
              <button className={`rp-tab ${tab === 'aging' ? 'active' : ''}`} onClick={() => setTab('aging')}>⏰ Overdue Aging</button>
              <button className={`rp-tab ${tab === 'pnl' ? 'active' : ''}`} onClick={() => setTab('pnl')}>📊 Monthly P&L</button>
            </div>

            <div className="rp-panel">
              {tab === 'revenue' && (
                <div>
                  <div className="rp-section-title">Monthly Revenue Trend (Last 6 Months)</div>
                  <div className="rp-chart">
                    {monthlyRevenue.map((m, i) => (
                      <div key={i} className="rp-bar-group">
                        <div className="rp-bars">
                          <div className="rp-bar" style={{ height: `${(m.invoiced / maxMonthly) * 100}%`, background: 'rgba(59, 130, 246, 0.7)' }} title={`Invoiced: ${fmtINR(m.invoiced)}`} />
                          <div className="rp-bar" style={{ height: `${(m.collected / maxMonthly) * 100}%`, background: 'rgba(16, 185, 129, 0.8)' }} title={`Collected: ${fmtINR(m.collected)}`} />
                          <div className="rp-bar" style={{ height: `${(m.expenses / maxMonthly) * 100}%`, background: 'rgba(248, 113, 113, 0.7)' }} title={`Expenses: ${fmtINR(m.expenses)}`} />
                        </div>
                        <div className="rp-bar-label">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rp-legend">
                    <div className="rp-legend-item"><div className="rp-legend-dot" style={{ background: 'rgba(59, 130, 246, 0.7)' }} /> Invoiced</div>
                    <div className="rp-legend-item"><div className="rp-legend-dot" style={{ background: 'rgba(16, 185, 129, 0.8)' }} /> Collected</div>
                    <div className="rp-legend-item"><div className="rp-legend-dot" style={{ background: 'rgba(248, 113, 113, 0.7)' }} /> Expenses</div>
                  </div>
                </div>
              )}

              {tab === 'clients' && (
                <div>
                  <div className="rp-section-title">Revenue by Client</div>
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th className="rp-th">Client</th>
                        <th className="rp-th">Invoices</th>
                        <th className="rp-th" style={{ textAlign: 'right' }}>Total Invoiced</th>
                        <th className="rp-th" style={{ textAlign: 'right' }}>Paid</th>
                        <th className="rp-th" style={{ textAlign: 'right' }}>Collection Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientBreakdown.map(c => (
                        <tr key={c.name}>
                          <td className="rp-td" style={{ fontWeight: 700 }}>{c.name}</td>
                          <td className="rp-td">{c.count}</td>
                          <td className="rp-td" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtINR(c.total)}</td>
                          <td className="rp-td" style={{ textAlign: 'right', color: '#34D399' }}>{fmtINR(c.paid)}</td>
                          <td className="rp-td" style={{ textAlign: 'right', fontWeight: 700, color: c.total > 0 && c.paid / c.total >= 0.8 ? '#34D399' : '#FBBF24' }}>
                            {c.total > 0 ? `${Math.round((c.paid / c.total) * 100)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'aging' && (
                <div>
                  <div className="rp-section-title">Overdue Aging Report</div>
                  <div className="rp-aging-grid">
                    {([['0-30', '0–30 Days', '#34D399'], ['31-60', '31–60 Days', '#FBBF24'], ['61-90', '61–90 Days', '#F97316'], ['90+', '90+ Days', '#F87171']] as const).map(([key, label, color]) => (
                      <div key={key} className="rp-aging-card">
                        <div className="rp-aging-label">{label}</div>
                        <div className="rp-aging-val" style={{ color }}>{fmtINR(agingBuckets[key])}</div>
                        <div className="rp-aging-bar">
                          <div className="rp-aging-fill" style={{ width: `${(agingBuckets[key] / maxAging) * 100}%`, background: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'pnl' && (
                <div>
                  <div className="rp-section-title">Monthly Profit & Loss Statement</div>
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th className="rp-th">Month</th>
                        <th className="rp-th" style={{ textAlign: 'right' }}>Revenue (Collected)</th>
                        <th className="rp-th" style={{ textAlign: 'right' }}>Expenses</th>
                        <th className="rp-th" style={{ textAlign: 'right' }}>Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyRevenue.map((m, i) => {
                        const profit = m.collected - m.expenses
                        return (
                          <tr key={i}>
                            <td className="rp-td" style={{ fontWeight: 600 }}>{m.label}</td>
                            <td className="rp-td" style={{ textAlign: 'right', color: '#34D399' }}>{fmtINR(m.collected)}</td>
                            <td className="rp-td" style={{ textAlign: 'right', color: '#F87171' }}>{fmtINR(m.expenses)}</td>
                            <td className="rp-td" style={{ textAlign: 'right', fontWeight: 800, color: profit >= 0 ? '#34D399' : '#F87171' }}>
                              {fmtINR(profit)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
