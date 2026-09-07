'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

interface Client {
  id: string
  name: string
  company_name: string | null
  pan_number?: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount_due: number
  issue_date: string
  paid_at: string | null
  clients: Client | null
}

interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: string
  paid_at: string
}

interface Props {
  invoices: Invoice[]
  payments: Payment[]
  profile: {
    full_name?: string
    business_name?: string
    pan_number?: string
    gst_number?: string
  }
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

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Financial Years helper
function getFY(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1 // 1-12
  const year = d.getFullYear()
  if (month >= 4) {
    return `FY ${year}-${String(year + 1).slice(2)}`
  } else {
    return `FY ${year - 1}-${String(year).slice(2)}`
  }
}

export default function TDSPage({
  invoices,
  payments,
  profile,
  userName,
  userEmail,
  userId,
}: Props) {
  const router = useRouter()
  const [selectedFY, setSelectedFY] = useState<string>('FY 2024-25')
  const [sectionFilter, setSectionFilter] = useState<'all' | '194J' | '194C'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTdsRates, setSelectedTdsRates] = useState<Record<string, number>>({})
  const [form16Status, setForm16Status] = useState<Record<string, 'pending' | 'received' | 'verified'>>({})

  // Compute TDS records per invoice
  const tdsRecords = useMemo(() => {
    return invoices.map(inv => {
      const grossAmount = Number(inv.total_amount)
      // Default rate based on amount or default 10% (194J) / 1% (194C)
      const defaultRate = grossAmount >= 30000 ? 10 : 2
      const rate = selectedTdsRates[inv.id] !== undefined ? selectedTdsRates[inv.id] : defaultRate
      const tdsAmount = Math.round((grossAmount * rate) / 100)
      const netCash = grossAmount - tdsAmount
      const fy = getFY(inv.issue_date)
      const section = rate === 1 ? '194C' : '194J'
      const status = form16Status[inv.id] || (inv.status === 'paid' ? 'pending' : 'pending')

      return {
        ...inv,
        grossAmount,
        rate,
        tdsAmount,
        netCash,
        fy,
        section,
        form16Status: status,
      }
    })
  }, [invoices, selectedTdsRates, form16Status])

  // Filter records by FY and Search
  const filteredRecords = useMemo(() => {
    return tdsRecords.filter(rec => {
      const matchFY = rec.fy === selectedFY || selectedFY === 'All'
      const matchSection = sectionFilter === 'all' || rec.section === sectionFilter
      const clientName = rec.clients?.company_name || rec.clients?.name || ''
      const matchSearch =
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
      return matchFY && matchSection && matchSearch
    })
  }, [tdsRecords, selectedFY, sectionFilter, searchQuery])

  // Aggregate Metrics
  const totalTdsAsset = filteredRecords.reduce((acc, r) => acc + r.tdsAmount, 0)
  const total194J = filteredRecords.filter(r => r.section === '194J').reduce((acc, r) => acc + r.tdsAmount, 0)
  const total194C = filteredRecords.filter(r => r.section === '194C').reduce((acc, r) => acc + r.tdsAmount, 0)
  const pendingCertificates = filteredRecords.filter(r => r.form16Status === 'pending').length

  const handleRateChange = (invId: string, rate: number) => {
    setSelectedTdsRates(prev => ({ ...prev, [invId]: rate }))
  }

  const handleStatusChange = (invId: string, status: 'pending' | 'received' | 'verified') => {
    setForm16Status(prev => ({ ...prev, [invId]: status }))
  }

  // 1-Click WhatsApp reminder for Form 16A
  const handleSendForm16Reminder = (rec: any) => {
    const phone = (rec.clients?.whatsapp || rec.clients?.phone || '').replace(/\D/g, '')
    if (!phone) {
      alert('No phone/WhatsApp number available for this client.')
      return
    }
    const clientName = rec.clients?.company_name || rec.clients?.name || 'Finance Team'
    const msg = encodeURIComponent(
      `Hi ${clientName},\n\nHope you are doing well. This is a request regarding TDS Form 16A certificate for Invoice ${rec.invoice_number} (TDS Deducted: ${fmtINR(rec.tdsAmount)} under Section ${rec.section}).\n\nKindly share the Form 16A for ${rec.fy} at your earliest convenience for our Income Tax filing and 26AS reconciliation.\n\nThank you,\n${userName}`
    )
    window.open(`https://wa.me/91${phone}?text=${msg}`, '_blank')
  }

  // CSV Export for CA
  const handleExportCSV = () => {
    const headers = ['Financial Year,Invoice No,Date,Client Name,PAN,Gross Amount (₹),TDS Section,TDS Rate (%),TDS Deducted (₹),Net Cash Received (₹),Form 16A Status']
    const rows = filteredRecords.map(r => [
      `"${r.fy}"`,
      `"${r.invoice_number}"`,
      `"${r.issue_date}"`,
      `"${r.clients?.company_name || r.clients?.name || 'Client'}"`,
      `"${r.clients?.pan_number || '—'}"`,
      r.grossAmount,
      `"Section ${r.section}"`,
      `${r.rate}%`,
      r.tdsAmount,
      r.netCash,
      `"${r.form16Status.toUpperCase()}"`,
    ].join(','))

    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `TDS-Reconciliation-${selectedFY.replace(/\s+/g, '-')}.csv`
    a.click()
  }

  return (
    <>
      <style>{`
        .tds-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .tds-main{flex:1;margin-left:220px;display:flex;flex-direction:column;min-height:100vh}
        .tds-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .tds-title{font-size:22px;font-weight:800;color:#FFF}
        .tds-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .tds-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:24px;max-width:1440px;width:100%;margin:0 auto}

        /* Metric Grid */
        .tds-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .tds-card{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px 22px;display:flex;flex-direction:column;justify-content:space-between;position:relative}
        .tds-card-lbl{font-size:11px;font-weight:700;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.08em}
        .tds-card-val{font-size:26px;font-weight:900;color:#FFF;margin:8px 0 4px}
        .tds-card-sub{font-size:11px;color:rgba(255,255,255,.4)}

        /* Filters Bar */
        .tds-filter-bar{display:flex;justify-content:space-between;align-items:center;background:rgba(18,30,22,.75);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px 18px;gap:12px;flex-wrap:wrap}
        .tds-fy-select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#FFF;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:600;font-family:'Outfit',sans-serif;cursor:pointer}
        .tds-search{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#FFF;padding:8px 14px;border-radius:10px;font-size:12px;width:240px;outline:none;font-family:'Outfit',sans-serif}

        /* Table */
        .tds-table-wrap{background:rgba(18,30,22,.7);border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden}
        .tds-table{width:100%;border-collapse:collapse}
        .tds-th{background:rgba(0,0,0,.3);font-size:11px;font-weight:700;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.08em;padding:14px 18px;text-align:left;border-bottom:1px solid rgba(255,255,255,.08)}
        .tds-td{padding:14px 18px;font-size:12px;color:rgba(255,255,255,.85);border-bottom:1px solid rgba(255,255,255,.04)}
        .tds-td.r{text-align:right}
        .tds-row:hover{background:rgba(255,255,255,.02)}

        .tds-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase}
        .tds-badge-pending{background:rgba(245,158,11,.15);color:#FBBF24;border:1px solid rgba(245,158,11,.3)}
        .tds-badge-received{background:rgba(59,130,246,.15);color:#60A5FA;border:1px solid rgba(59,130,246,.3)}
        .tds-badge-verified{background:rgba(16,185,129,.15);color:#34D399;border:1px solid rgba(16,185,129,.3)}

        @media(max-width:1024px){
          .tds-main{margin-left:0; padding:16px; padding-top:64px; padding-bottom:80px}
          .tds-grid{grid-template-columns:repeat(2,1fr)}
          .tds-table-wrap{overflow-x:auto}
          .tds-table{min-width:680px}
          .tds-top{flex-wrap:wrap; gap:12px}
        }
        @media(max-width:640px){
          .tds-grid{grid-template-columns:1fr}
          .tds-top button{width:100%; justify-content:center}
          .tds-filter-bar{flex-direction:column; align-items:stretch}
          .tds-search{width:100%}
        }
      `}</style>

      <div className="tds-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="tds-main">
          <div className="tds-top">
            <div>
              <div className="tds-title">🧾 TDS Asset Ledger & Form 16A Tracker</div>
              <div className="tds-sub">Track client tax withholdings, claim Form 16A certificates, and reconcile Form 26AS</div>
            </div>
            <button
              className="kokonut-btn-primary"
              style={{ padding: '8px 16px', fontSize: 12 }}
              onClick={handleExportCSV}
            >
              📥 Export CA ITR Report (.csv)
            </button>
          </div>

          <div className="tds-content">
            {/* Metric Overview Cards */}
            <div className="tds-grid">
              <div className="tds-card" style={{ border: '1px solid rgba(16,185,129,.3)', background: 'linear-gradient(135deg,rgba(16,185,129,.08),rgba(18,30,22,.8))' }}>
                <div className="tds-card-lbl" style={{ color: '#34D399' }}>Total TDS Tax Asset</div>
                <div className="tds-card-val" style={{ color: '#34D399' }}>{fmtINR(totalTdsAsset)}</div>
                <div className="tds-card-sub">Available to offset Income Tax in ITR</div>
              </div>

              <div className="tds-card">
                <div className="tds-card-lbl">Section 194J (Tech & Prof.)</div>
                <div className="tds-card-val">{fmtINR(total194J)}</div>
                <div className="tds-card-sub">10% / 2% Professional TDS</div>
              </div>

              <div className="tds-card">
                <div className="tds-card-lbl">Section 194C (Contractors)</div>
                <div className="tds-card-val">{fmtINR(total194C)}</div>
                <div className="tds-card-sub">1% Works & Labor contracts</div>
              </div>

              <div className="tds-card">
                <div className="tds-card-lbl">Pending Form 16A</div>
                <div className="tds-card-val" style={{ color: pendingCertificates > 0 ? '#FBBF24' : '#FFF' }}>
                  {pendingCertificates}
                </div>
                <div className="tds-card-sub">Certificates awaiting client release</div>
              </div>
            </div>

            {/* Filter and FY Bar */}
            <div className="tds-filter-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>Financial Year:</span>
                <select
                  className="tds-fy-select"
                  value={selectedFY}
                  onChange={e => setSelectedFY(e.target.value)}
                >
                  <option value="FY 2024-25">FY 2024-25</option>
                  <option value="FY 2025-26">FY 2025-26</option>
                  <option value="FY 2026-27">FY 2026-27</option>
                  <option value="All">All Years</option>
                </select>

                <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                  {(['all', '194J', '194C'] as const).map(sec => (
                    <button
                      key={sec}
                      className={`ex-filter-btn ${sectionFilter === sec ? 'active' : ''}`}
                      onClick={() => setSectionFilter(sec)}
                    >
                      {sec === 'all' ? 'All Sections' : `Section ${sec}`}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                className="tds-search"
                placeholder="🔍 Search client or invoice..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* TDS Ledger Table */}
            <div className="tds-table-wrap">
              <table className="tds-table">
                <thead>
                  <tr>
                    <th className="tds-th">Invoice & Date</th>
                    <th className="tds-th">Client / Enterprise</th>
                    <th className="tds-th r">Gross Value</th>
                    <th className="tds-th">TDS Section & Rate</th>
                    <th className="tds-th r">TDS Deducted</th>
                    <th className="tds-th r">Net Received</th>
                    <th className="tds-th">Form 16A Status</th>
                    <th className="tds-th r">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,.35)' }}>
                        No invoices found for {selectedFY}. Create an invoice to track TDS withholdings.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map(rec => (
                      <tr key={rec.id} className="tds-row">
                        <td className="tds-td">
                          <div style={{ fontWeight: 700, color: '#FFF' }}>{rec.invoice_number}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{fmtDate(rec.issue_date)}</div>
                        </td>

                        <td className="tds-td">
                          <div style={{ fontWeight: 600, color: '#FFF' }}>
                            {rec.clients?.company_name || rec.clients?.name || 'Client'}
                          </div>
                          {rec.clients?.pan_number && (
                            <div style={{ fontSize: 10, color: '#34D399' }}>
                              PAN: {rec.clients.pan_number}
                            </div>
                          )}
                        </td>

                        <td className="tds-td r" style={{ fontWeight: 700 }}>
                          {fmtINR(rec.grossAmount)}
                        </td>

                        <td className="tds-td">
                          <select
                            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#FFF', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontFamily: 'inherit' }}
                            value={rec.rate}
                            onChange={e => handleRateChange(rec.id, Number(e.target.value))}
                          >
                            <option value={10}>194J - 10% (Tech/Prof)</option>
                            <option value={2}>194J - 2% (Call Center/BPO)</option>
                            <option value={1}>194C - 1% (Contractor)</option>
                            <option value={0}>0% (No TDS)</option>
                          </select>
                        </td>

                        <td className="tds-td r" style={{ fontWeight: 800, color: '#FBBF24' }}>
                          {fmtINR(rec.tdsAmount)}
                        </td>

                        <td className="tds-td r" style={{ fontWeight: 600, color: '#34D399' }}>
                          {fmtINR(rec.netCash)}
                        </td>

                        <td className="tds-td">
                          <select
                            style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                            value={rec.form16Status}
                            onChange={e => handleStatusChange(rec.id, e.target.value as any)}
                          >
                            <option value="pending" style={{ background: '#121E16' }}>⏳ Pending Form 16A</option>
                            <option value="received" style={{ background: '#121E16' }}>📥 Received Certificate</option>
                            <option value="verified" style={{ background: '#121E16' }}>✓ Verified in 26AS</option>
                          </select>
                        </td>

                        <td className="tds-td r">
                          <button
                            style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: '1px solid #25D366', background: 'rgba(37,211,102,.1)', color: '#25D366', cursor: 'pointer', fontFamily: 'inherit' }}
                            onClick={() => handleSendForm16Reminder(rec)}
                            title="Send WhatsApp request for Form 16A"
                          >
                            📱 Request 16A
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
