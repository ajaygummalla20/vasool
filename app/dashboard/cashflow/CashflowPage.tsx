'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface Client {
  id: string
  name: string
  company_name: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_due: number
  issue_date: string
  due_date: string
  paid_at: string | null
  clients: Client | null
}

interface RecurringTemplate {
  id: string
  amount: number
  frequency: string // 'monthly' | 'weekly' | 'quarterly' | 'yearly'
  next_issue_date: string
}

interface Expense {
  id: string
  amount: number
  category: string
  is_tax_deductible: boolean
  expense_date: string
}

interface Props {
  invoices: Invoice[]
  recurring: RecurringTemplate[]
  expenses: Expense[]
  userName: string
  userEmail: string
  userId: string
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export default function CashflowPage({
  invoices,
  recurring,
  expenses,
  userName,
  userEmail,
  userId,
}: Props) {
  const router = useRouter()
  const [openingBalance, setOpeningBalance] = useState<number>(100000) // Default starting cash in bank
  const [punctualityWeight, setPunctualityWeight] = useState<number>(90) // 90% expected collection realization
  const [selectedHorizon, setSelectedHorizon] = useState<30 | 60 | 90>(90)

  // 1. Calculate Monthly Recurring Inflow (MRR)
  const monthlyRecurringInflow = useMemo(() => {
    return recurring.reduce((sum, r) => {
      const amt = Number(r.amount) || 0
      if (r.frequency === 'weekly') return sum + amt * 4.33
      if (r.frequency === 'quarterly') return sum + amt / 3
      if (r.frequency === 'yearly') return sum + amt / 12
      return sum + amt
    }, 0)
  }, [recurring])

  // 2. Calculate Average Monthly Expense Burn
  const monthlyExpenseBurn = useMemo(() => {
    if (expenses.length === 0) return 35000 // Estimated base operational burn
    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0)
    return Math.round(totalExp / Math.max(1, Math.min(3, expenses.length))) || 35000
  }, [expenses])

  // 3. Compute 30-Day, 60-Day, 90-Day Buckets
  const now = new Date()
  const d30 = new Date(now.getTime() + 30 * 86400000)
  const d60 = new Date(now.getTime() + 60 * 86400000)
  const d90 = new Date(now.getTime() + 90 * 86400000)

  // Unpaid invoices due in horizon
  const pendingInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status !== 'paid' && Number(inv.amount_due) > 0)
  }, [invoices])

  const bucket30Invoices = pendingInvoices.filter(i => new Date(i.due_date) <= d30)
  const bucket60Invoices = pendingInvoices.filter(i => new Date(i.due_date) > d30 && new Date(i.due_date) <= d60)
  const bucket90Invoices = pendingInvoices.filter(i => new Date(i.due_date) > d60 && new Date(i.due_date) <= d90)

  const invSum30 = bucket30Invoices.reduce((s, i) => s + Number(i.amount_due), 0)
  const invSum60 = bucket60Invoices.reduce((s, i) => s + Number(i.amount_due), 0)
  const invSum90 = bucket90Invoices.reduce((s, i) => s + Number(i.amount_due), 0)

  // Weighted Collections
  const weightFactor = punctualityWeight / 100
  const inflow30 = Math.round((invSum30 + monthlyRecurringInflow) * weightFactor)
  const inflow60 = Math.round((invSum60 + monthlyRecurringInflow) * weightFactor)
  const inflow90 = Math.round((invSum90 + monthlyRecurringInflow) * weightFactor)

  const outflow30 = monthlyExpenseBurn
  const outflow60 = monthlyExpenseBurn
  const outflow90 = monthlyExpenseBurn

  // Projected balances over time
  const net30 = inflow30 - outflow30
  const net60 = inflow60 - outflow60
  const net90 = inflow90 - outflow90

  const bal30 = openingBalance + net30
  const bal60 = bal30 + net60
  const bal90 = bal60 + net90

  const minBalance = Math.min(openingBalance, bal30, bal60, bal90)
  const isHealthy = minBalance > 50000
  const isCaution = minBalance >= 0 && minBalance <= 50000
  const isCritical = minBalance < 0

  const totalProjectedInflows = inflow30 + (selectedHorizon >= 60 ? inflow60 : 0) + (selectedHorizon === 90 ? inflow90 : 0)
  const totalProjectedOutflows = outflow30 + (selectedHorizon >= 60 ? outflow60 : 0) + (selectedHorizon === 90 ? outflow90 : 0)
  const finalBalance = selectedHorizon === 30 ? bal30 : selectedHorizon === 60 ? bal60 : bal90

  // Working Capital Liquidity & DSO Analytics
  const totalInvoicedAllTime = invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0)
  const totalReceivables = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.amount_due || 0), 0)
  const overdueReceivables = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount_due || 0), 0)
  const dsoDays = totalInvoicedAllTime > 0 ? Math.max(1, Math.round((totalReceivables / totalInvoicedAllTime) * 90)) : 0
  const runwayMonths = monthlyExpenseBurn > 0 ? (openingBalance / monthlyExpenseBurn).toFixed(1) : '∞'
  const netWorkingCapital = openingBalance + totalReceivables - (monthlyExpenseBurn * 3)
  const overdueRatio = totalReceivables > 0 ? Math.round((overdueReceivables / totalReceivables) * 100) : 0

  return (
    <>
      <style>{`
        .cf-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .cf-main{flex:1;margin-left:220px;display:flex;flex-direction:column;min-height:100vh}
        .cf-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .cf-title{font-size:22px;font-weight:800;color:#FFF}
        .cf-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .cf-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:24px;max-width:1440px;width:100%;margin:0 auto}

        /* Top Health Banner */
        .cf-banner{
          background: rgba(18,30,22,.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px; padding: 24px 28px;
          display: flex; justify-content: space-between; align-items: center; gap: 24px;
        }
        .cf-badge-health{
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 14px; border-radius: 100px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .08em;
        }
        .cf-healthy{background: rgba(16,185,129,.15); color: #34D399; border: 1px solid rgba(16,185,129,.35); box-shadow: 0 0 15px rgba(16,185,129,.2);}
        .cf-caution{background: rgba(245,158,11,.15); color: #FBBF24; border: 1px solid rgba(245,158,11,.35); box-shadow: 0 0 15px rgba(245,158,11,.2);}
        .cf-critical{background: rgba(239,68,68,.15); color: #F87171; border: 1px solid rgba(239,68,68,.35); box-shadow: 0 0 15px rgba(239,68,68,.2);}

        /* Metric Grid */
        .cf-grid{display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;}
        .cf-card{background: rgba(18,30,22,.7); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 20px 22px; display: flex; flex-direction: column; justify-content: space-between;}
        .cf-card-lbl{font-size: 11px; font-weight: 700; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .08em;}
        .cf-card-val{font-size: 26px; font-weight: 900; color: #FFF; margin: 8px 0 4px;}
        .cf-card-sub{font-size: 11px; color: rgba(255,255,255,.4);}

        /* Horizon Forecast Graph Grid */
        .cf-horizon-grid{display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;}
        .cf-period-card{
          background: rgba(18,30,22,.7); border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 14px;
        }

        .cf-bar-wrap{height: 8px; background: rgba(255,255,255,.06); border-radius: 100px; overflow: hidden; display: flex;}
        .cf-bar-in{background: #10B981; height: 100%;}
        .cf-bar-out{background: #EF4444; height: 100%;}
        .cf-dso-grid{display:grid; grid-template-columns:repeat(4, 1fr); gap:14px;}

        @media(max-width:1024px){
          .cf-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .cf-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .cf-content{padding:16px}
          .cf-banner{flex-direction:column; align-items:stretch; gap:16px}
          .cf-dso-grid{grid-template-columns:repeat(2, 1fr)}
          .cf-grid{grid-template-columns:repeat(2, 1fr)}
          .cf-horizon-grid{grid-template-columns:1fr}
        }
        @media(max-width:640px){
          .cf-dso-grid{grid-template-columns:1fr}
          .cf-grid{grid-template-columns:1fr}
        }
      `}</style>

      <div className="cf-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="cf-main">
          <div className="cf-top">
            <div>
              <div className="cf-title">📈 90-Day Cashflow Runway & Working Capital Forecast</div>
              <div className="cf-sub">Forward-looking cash projections based on invoice due dates, retainers, and operational burn</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([30, 60, 90] as const).map(h => (
                <button
                  key={h}
                  className={`ex-filter-btn ${selectedHorizon === h ? 'active' : ''}`}
                  onClick={() => setSelectedHorizon(h)}
                >
                  {h}-Day Forecast
                </button>
              ))}
            </div>
          </div>

          <div className="cf-content">
            {/* Top Runway Health Status Banner */}
            <div className="cf-banner">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className={`cf-badge-health ${
                      isHealthy ? 'cf-healthy' : isCaution ? 'cf-caution' : 'cf-critical'
                    }`}
                  >
                    {isHealthy ? '🟢 Healthy Cash Runway' : isCaution ? '🟡 Tight Working Capital' : '🔴 Cash Deficit Risk'}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
                    Horizon: Next {selectedHorizon} Days
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginTop: 10 }}>
                  {isHealthy
                    ? `Projected closing cash balance: ${fmtINR(finalBalance)} (+${fmtINR(finalBalance - openingBalance)} net)`
                    : isCaution
                    ? `Caution: Cash dip to ${fmtINR(minBalance)} expected within ${selectedHorizon} days.`
                    : `Alert: Projected working capital shortage of ${fmtINR(Math.abs(minBalance))} within ${selectedHorizon} days!`}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
                  Assumes {punctualityWeight}% collection realization on pending invoices + ₹{monthlyRecurringInflow.toLocaleString('en-IN')}/mo retainers.
                </div>
              </div>

              {/* Adjust Starting Cash Input */}
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '14px 20px', minWidth: 260 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                  Current Bank Cash (₹)
                </div>
                <input
                  type="number"
                  style={{ width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8, padding: '6px 10px', color: '#34D399', fontSize: 16, fontWeight: 800, fontFamily: 'inherit', outline: 'none' }}
                  value={openingBalance}
                  onChange={e => setOpeningBalance(Number(e.target.value) || 0)}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
                  <span>Collection Weight:</span>
                  <strong>{punctualityWeight}%</strong>
                </div>
              </div>
            </div>

            {/* Working Capital & DSO Intelligence Deck */}
            <div className="cf-dso-grid">
              <div style={{ background: 'rgba(18,30,22,.6)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>DSO (Days Sales Outstanding)</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: dsoDays <= 30 ? '#34D399' : dsoDays <= 45 ? '#FBBF24' : '#F87171', marginTop: 4 }}>
                  {dsoDays} Days
                </div>
                <div style={{ fontSize: 10, color: dsoDays <= 30 ? '#34D399' : dsoDays <= 45 ? '#FBBF24' : '#F87171', marginTop: 2 }}>
                  {dsoDays <= 30 ? '🟢 Optimal collection cycle' : dsoDays <= 45 ? '🟡 Standard (Under 45D cap)' : '🔴 High MSME delay risk'}
                </div>
              </div>

              <div style={{ background: 'rgba(18,30,22,.6)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Cash Runway Coverage</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: Number(runwayMonths) >= 3 || runwayMonths === '∞' ? '#34D399' : '#F87171', marginTop: 4 }}>
                  {runwayMonths} {runwayMonths === '∞' ? '' : 'Months'}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                  At current {fmtINR(monthlyExpenseBurn)}/mo burn
                </div>
              </div>

              <div style={{ background: 'rgba(18,30,22,.6)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>90-Day Net Working Capital</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: netWorkingCapital >= 0 ? '#34D399' : '#F87171', marginTop: 4 }}>
                  {fmtINR(netWorkingCapital)}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                  Cash + Receivables − 90D Burn
                </div>
              </div>

              <div style={{ background: 'rgba(18,30,22,.6)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Overdue Receivables Ratio</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: overdueRatio > 30 ? '#F87171' : '#34D399', marginTop: 4 }}>
                  {overdueRatio}%
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
                  {fmtINR(overdueReceivables)} overdue past terms
                </div>
              </div>
            </div>

            {/* 4 Summary Cards */}
            <div className="cf-grid">
              <div className="cf-card" style={{ border: '1px solid rgba(16,185,129,.3)' }}>
                <div className="cf-card-lbl" style={{ color: '#34D399' }}>Projected Inflows</div>
                <div className="cf-card-val" style={{ color: '#34D399' }}>{fmtINR(totalProjectedInflows)}</div>
                <div className="cf-card-sub">Invoices + Retainers ({selectedHorizon} Days)</div>
              </div>

              <div className="cf-card" style={{ border: '1px solid rgba(239,68,68,.3)' }}>
                <div className="cf-card-lbl" style={{ color: '#F87171' }}>Projected Outflows</div>
                <div className="cf-card-val" style={{ color: '#F87171' }}>{fmtINR(totalProjectedOutflows)}</div>
                <div className="cf-card-sub">Operational Burn & Expenses</div>
              </div>

              <div className="cf-card">
                <div className="cf-card-lbl">Monthly Retainer MRR</div>
                <div className="cf-card-val">{fmtINR(monthlyRecurringInflow)}</div>
                <div className="cf-card-sub">{recurring.length} Active recurring contract(s)</div>
              </div>

              <div className="cf-card">
                <div className="cf-card-lbl">Closing Cash Balance</div>
                <div className="cf-card-val" style={{ color: finalBalance >= 0 ? '#34D399' : '#F87171' }}>
                  {fmtINR(finalBalance)}
                </div>
                <div className="cf-card-sub">Day {selectedHorizon} Projected Bank Balance</div>
              </div>
            </div>

            {/* Horizon Breakdown Cards (Day 0-30, 31-60, 61-90) */}
            <div className="cf-horizon-grid">
              {/* Day 1 - 30 */}
              <div className="cf-period-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>Month 1 (Days 1–30)</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,.15)', color: '#34D399' }}>
                    {bucket30Invoices.length} Invoices Due
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Expected Inflow:</span>
                  <strong style={{ color: '#34D399' }}>+{fmtINR(inflow30)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Expected Outflow:</span>
                  <strong style={{ color: '#F87171' }}>−{fmtINR(outflow30)}</strong>
                </div>

                <div className="cf-bar-wrap">
                  <div className="cf-bar-in" style={{ width: `${Math.min(100, (inflow30 / (inflow30 + outflow30 || 1)) * 100)}%` }} />
                  <div className="cf-bar-out" style={{ width: `${Math.min(100, (outflow30 / (inflow30 + outflow30 || 1)) * 100)}%` }} />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.6)' }}>Day 30 Cash:</span>
                  <strong style={{ color: bal30 >= 0 ? '#FFF' : '#F87171' }}>{fmtINR(bal30)}</strong>
                </div>
              </div>

              {/* Day 31 - 60 */}
              <div className="cf-period-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>Month 2 (Days 31–60)</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,.15)', color: '#60A5FA' }}>
                    {bucket60Invoices.length} Invoices Due
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Expected Inflow:</span>
                  <strong style={{ color: '#34D399' }}>+{fmtINR(inflow60)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Expected Outflow:</span>
                  <strong style={{ color: '#F87171' }}>−{fmtINR(outflow60)}</strong>
                </div>

                <div className="cf-bar-wrap">
                  <div className="cf-bar-in" style={{ width: `${Math.min(100, (inflow60 / (inflow60 + outflow60 || 1)) * 100)}%` }} />
                  <div className="cf-bar-out" style={{ width: `${Math.min(100, (outflow60 / (inflow60 + outflow60 || 1)) * 100)}%` }} />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.6)' }}>Day 60 Cash:</span>
                  <strong style={{ color: bal60 >= 0 ? '#FFF' : '#F87171' }}>{fmtINR(bal60)}</strong>
                </div>
              </div>

              {/* Day 61 - 90 */}
              <div className="cf-period-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#FFF' }}>Month 3 (Days 61–90)</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(168,85,247,.15)', color: '#C084FC' }}>
                    {bucket90Invoices.length} Invoices Due
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Expected Inflow:</span>
                  <strong style={{ color: '#34D399' }}>+{fmtINR(inflow90)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>Expected Outflow:</span>
                  <strong style={{ color: '#F87171' }}>−{fmtINR(outflow90)}</strong>
                </div>

                <div className="cf-bar-wrap">
                  <div className="cf-bar-in" style={{ width: `${Math.min(100, (inflow90 / (inflow90 + outflow90 || 1)) * 100)}%` }} />
                  <div className="cf-bar-out" style={{ width: `${Math.min(100, (outflow90 / (inflow90 + outflow90 || 1)) * 100)}%` }} />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.6)' }}>Day 90 Cash:</span>
                  <strong style={{ color: bal90 >= 0 ? '#FFF' : '#F87171' }}>{fmtINR(bal90)}</strong>
                </div>
              </div>
            </div>

            {/* CFO Recommendations Box */}
            <div className="kokonut-card" style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💡</span> CFO Cashflow Action Plan
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bucket30Invoices.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.03)', padding: '10px 14px', borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                      ⚡ <strong>{bucket30Invoices.length} invoice(s)</strong> due in the next 30 days ({fmtINR(invSum30)}). Send automated WhatsApp reminders 3 days before due date.
                    </span>
                    <button
                      style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #10B981', background: 'rgba(16,185,129,.15)', color: '#34D399', cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={() => router.push('/dashboard/invoices')}
                    >
                      View Invoices →
                    </button>
                  </div>
                )}

                {recurring.length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.03)', padding: '10px 14px', borderRadius: 10 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                      🔄 Convert 1 or 2 high-value clients into <strong>Monthly Retainers</strong> to build a predictable baseline MRR.
                    </span>
                    <button
                      style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #3B82F6', background: 'rgba(59,130,246,.15)', color: '#60A5FA', cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={() => router.push('/dashboard/invoices/recurring')}
                    >
                      Set Retainer →
                    </button>
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
