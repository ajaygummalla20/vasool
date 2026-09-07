'use client'

import { useState, useMemo } from 'react'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface ClientInfo {
  id: string
  name: string
  company_name: string | null
  gstin: string | null
  state: string | null
  email: string | null
  whatsapp: string | null
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  hsn_sac: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  issue_date: string
  due_date: string
  created_at: string
  invoice_items: InvoiceItem[]
  clients: ClientInfo | null
}

interface Profile {
  full_name: string
  business_name: string | null
  gstin: string | null
  address: string | null
  phone: string | null
}

interface Props {
  invoices: Invoice[]
  profile: Profile
  userName: string
  userEmail: string
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

export default function GstPageClient({
  invoices,
  profile,
  userName,
  userEmail,
}: Props) {
  const [period, setPeriod] = useState<'current_month' | 'quarter' | 'all'>('current_month')
  const [activeTab, setActiveTab] = useState<'summary' | 'b2b' | 'hsn' | 'advancetax' | 'payment'>('summary')
  const [copiedMsg, setCopiedMsg] = useState(false)

  // Filter invoices by selected period
  const filteredInvoices = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return invoices.filter(inv => {
      if (inv.status === 'draft') return false // ignore draft invoices for tax
      const invDate = new Date(inv.issue_date || inv.created_at)

      if (period === 'current_month') {
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth
      } else if (period === 'quarter') {
        const qStartMonth = Math.floor(currentMonth / 3) * 3
        return invDate.getFullYear() === currentYear && invDate.getMonth() >= qStartMonth && invDate.getMonth() < qStartMonth + 3
      }
      return true
    })
  }, [invoices, period])

  // Compute GST Liability Metrics
  const taxMetrics = useMemo(() => {
    let totalTurnover = 0
    let totalTaxableValue = 0
    let totalCgst = 0
    let totalSgst = 0
    let totalIgst = 0

    let b2bCount = 0
    let b2cCount = 0

    filteredInvoices.forEach(inv => {
      const total = Number(inv.total_amount || 0)
      const tax = Number(inv.tax_amount || 0)
      const subtotal = Number(inv.subtotal || total - tax)

      totalTurnover += total
      totalTaxableValue += subtotal

      const isInterstate = inv.clients?.state && !inv.clients.state.toLowerCase().includes('telangana') && !inv.clients.state.toLowerCase().includes('ap')

      if (isInterstate) {
        totalIgst += tax
      } else {
        totalCgst += tax / 2
        totalSgst += tax / 2
      }

      if (inv.clients?.gstin) {
        b2bCount++
      } else {
        b2cCount++
      }
    })

    const totalGstLiability = totalCgst + totalSgst + totalIgst

    return {
      totalTurnover,
      totalTaxableValue,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGstLiability,
      b2bCount,
      b2cCount,
      totalInvoices: filteredInvoices.length,
    }
  }, [filteredInvoices])

  // HSN Code Grouping Summary
  const hsnSummary = useMemo(() => {
    const map: Record<string, { code: string; desc: string; totalQty: number; taxableVal: number; taxVal: number }> = {}

    filteredInvoices.forEach(inv => {
      const items = inv.invoice_items || []
      const rate = Number(inv.tax_rate || 18)

      items.forEach(item => {
        const code = item.hsn_sac || '998311' // default IT/software services HSN
        const amt = Number(item.amount || (item.quantity * item.unit_price))
        const tax = (amt * rate) / 100

        if (!map[code]) {
          map[code] = {
            code,
            desc: item.description || 'Software Development & IT Consultancy Services',
            totalQty: 0,
            taxableVal: 0,
            taxVal: 0,
          }
        }
        map[code].totalQty += Number(item.quantity || 1)
        map[code].taxableVal += amt
        map[code].taxVal += tax
      })
    })

    return Object.values(map)
  }, [filteredInvoices])

  // Export GSTR-1 JSON (GST Portal format)
  const handleExportGstr1Json = () => {
    const fpMonth = String(new Date().getMonth() + 1).padStart(2, '0')
    const fpYear = new Date().getFullYear()

    const gstr1Payload = {
      gstin: profile.gstin || '36ABCDE1234F1Z5',
      fp: `${fpMonth}${fpYear}`,
      gt: taxMetrics.totalTurnover,
      cur_gt: taxMetrics.totalTurnover,
      b2b: filteredInvoices
        .filter(inv => inv.clients?.gstin)
        .map(inv => ({
          ctin: inv.clients?.gstin,
          inv: [
            {
              inum: inv.invoice_number,
              idt: inv.issue_date,
              val: inv.total_amount,
              pos: '36',
              rchrg: 'N',
              inv_typ: 'R',
              itms: [
                {
                  num: 1,
                  itm_det: {
                    txval: inv.subtotal || inv.total_amount,
                    rt: inv.tax_rate || 18,
                    camt: taxMetrics.totalCgst,
                    samt: taxMetrics.totalSgst,
                    iamt: taxMetrics.totalIgst,
                  }
                }
              ]
            }
          ]
        })),
      b2cs: filteredInvoices
        .filter(inv => !inv.clients?.gstin)
        .map(inv => ({
          sply_ty: 'INTRA',
          pos: '36',
          typ: 'OE',
          rt: inv.tax_rate || 18,
          txval: inv.subtotal || inv.total_amount,
          iamt: 0,
          csamt: 0
        }))
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(gstr1Payload, null, 2))}`
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonString)
    downloadAnchor.setAttribute('download', `GSTR1_${profile.gstin || 'Settlr'}_${fpMonth}${fpYear}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Export CA Summary CSV
  const handleExportCaCsv = () => {
    let csv = 'Invoice Number,Issue Date,Client Name,Client GSTIN,State,Taxable Value (INR),CGST (9%),SGST (9%),IGST (18%),Total Invoice Value (INR),Status\n'

    filteredInvoices.forEach(inv => {
      const isInterstate = inv.clients?.state && !inv.clients.state.toLowerCase().includes('telangana') && !inv.clients.state.toLowerCase().includes('ap')
      const tax = Number(inv.tax_amount || 0)
      const cgst = isInterstate ? 0 : tax / 2
      const sgst = isInterstate ? 0 : tax / 2
      const igst = isInterstate ? tax : 0

      csv += `"${inv.invoice_number}","${inv.issue_date}","${inv.clients?.name || 'Client'}","${inv.clients?.gstin || 'B2C (Unregistered)'}","${inv.clients?.state || 'Telangana'}",${inv.subtotal || 0},${cgst},${sgst},${igst},${inv.total_amount || 0},"${inv.status.toUpperCase()}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Settlr_GST_Sales_Summary_${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Advance Tax & Section 44ADA Presumptive Taxation Computation
  const advanceTaxCalc = useMemo(() => {
    // Gross Invoicing Turnover
    const grossReceipts = invoices.reduce((s, i) => s + Number(i.subtotal || i.total_amount || 0), 0)
    
    // Presumptive Profit: Section 44ADA = 50% (IT & Professionals); Section 44AD = 6% (Digital Business)
    const profit44ADA = Math.round(grossReceipts * 0.50)
    const profit44AD = Math.round(grossReceipts * 0.06)

    // Calculate Tax under New Regime (FY 2024-25 / 2025-26 slabs)
    function calcIncomeTax(taxableIncome: number): number {
      if (taxableIncome <= 700000) return 0 // Section 87A full rebate up to 7 Lakhs
      let tax = 0
      if (taxableIncome > 1500000) {
        tax = 140000 + (taxableIncome - 1500000) * 0.30
      } else if (taxableIncome > 1200000) {
        tax = 80000 + (taxableIncome - 1200000) * 0.20
      } else if (taxableIncome > 1000000) {
        tax = 50000 + (taxableIncome - 1000000) * 0.15
      } else if (taxableIncome > 700000) {
        tax = 20000 + (taxableIncome - 700000) * 0.10
      }
      return Math.round(tax * 1.04) // Add 4% Health & Education Cess
    }

    const estimatedTax44ADA = calcIncomeTax(profit44ADA)
    
    // Total approx TDS deducted by clients (Section 194J/194C)
    const approxTdsDeducted = invoices
      .filter(i => i.status === 'paid' || i.status === 'partially_paid')
      .reduce((s, i) => s + (Number(i.subtotal || i.total_amount) * 0.10), 0)

    const netTaxPayable = Math.max(0, estimatedTax44ADA - Math.round(approxTdsDeducted))

    // 4 Statutory Advance Tax Installments (Section 208/211)
    const q1Due = Math.round(netTaxPayable * 0.15) // June 15
    const q2Due = Math.round(netTaxPayable * 0.45) // Sept 15
    const q3Due = Math.round(netTaxPayable * 0.75) // Dec 15
    const q4Due = netTaxPayable                    // March 15

    return {
      grossReceipts,
      profit44ADA,
      profit44AD,
      estimatedTax44ADA,
      approxTdsDeducted: Math.round(approxTdsDeducted),
      netTaxPayable,
      q1Due,
      q2Due,
      q3Due,
      q4Due,
      isAdvanceTaxMandatory: netTaxPayable >= 10000
    }
  }, [invoices])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8;color:#1A140D}

        .gst-root{display:flex;min-height:100vh}
        .gst-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        /* Topbar Header */
        .gst-top{background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;backdrop-filter:blur(10px)}
        .gst-top-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .gst-top-sub{font-size:11px;color:rgba(26,20,13,.38);margin-top:2px}

        .gst-actions{display:flex;align-items:center;gap:8px}
        .gst-btn-secondary{background:white;border:1px solid rgba(26,20,13,.12);border-radius:9px;padding:8px 14px;font-size:12px;font-weight:600;color:#1A140D;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;transition:all .18s;box-shadow:0 1px 3px rgba(26,20,13,.04)}
        .gst-btn-secondary:hover{border-color:#1B5E3B;color:#1B5E3B;transform:translateY(-1px)}

        .gst-btn-primary{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:9px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 3px 10px rgba(27,94,59,.25);transition:all .18s}
        .gst-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(27,94,59,.35)}

        .gst-content{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:16px;max-width:1440px;width:100%;margin:0 auto}

        /* Period Switcher Bar */
        .gst-control-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
        .gst-period-deck{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:10px;padding:3px;display:flex;gap:2px}
        .gst-period-btn{padding:6px 14px;font-size:11px;font-weight:600;color:rgba(26,20,13,.50);cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;border-radius:7px;transition:all .15s}
        .gst-period-btn.active{background:white;color:#1B5E3B;box-shadow:0 1px 4px rgba(26,20,13,.08)}

        /* Metrics Motion Grid */
        .gst-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .gst-stat-card{background:#FDFAF5;border:1px solid rgba(26,20,13,.08);border-radius:14px;padding:16px;display:flex;flex-direction:column;transition:all .2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 2px 6px rgba(26,20,13,.02)}
        .gst-stat-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(26,20,13,.06);border-color:rgba(27,94,59,.25)}

        .gst-stat-label{font-size:10px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .gst-stat-val{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1A140D;letter-spacing:-.02em;line-height:1}
        .gst-stat-sub{font-size:10px;color:rgba(26,20,13,.45);margin-top:6px}

        /* Kokonut-style Tabs */
        .gst-tabs-deck{background:rgba(253,250,245,.9);border:1px solid rgba(26,20,13,.08);border-radius:14px;padding:4px;display:flex;gap:4px}
        .gst-tab-btn{flex:1;padding:10px 14px;font-size:12px;font-weight:600;color:rgba(26,20,13,.50);border:none;background:none;font-family:'DM Sans',sans-serif;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .18s}
        .gst-tab-btn:hover{color:#1A140D;background:rgba(26,20,13,.03)}
        .gst-tab-btn.active{background:white;color:#1B5E3B;box-shadow:0 2px 10px rgba(26,20,13,.08)}

        /* Panel Container */
        .gst-panel{background:#FDFAF5;border:1px solid rgba(26,20,13,.08);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:0 10px 30px -10px rgba(26,20,13,.05)}

        /* Table */
        .gst-table{width:100%;border-collapse:collapse}
        .gst-th{font-size:9px;font-weight:600;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.07em;padding:12px 16px;text-align:left;border-bottom:1px solid rgba(26,20,13,.08);background:#FAF7F2}
        .gst-td{padding:12px 16px;border-bottom:.5px solid rgba(26,20,13,.05);font-size:12px;color:#1A140D;vertical-align:middle}
        .gst-tr:hover{background:rgba(26,20,13,.02)}

        /* Banner */
        .gst-banner{background:linear-gradient(135deg,rgba(27,94,59,.08),rgba(27,94,59,.02));border:1px solid rgba(27,94,59,.18);border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}

        @media(max-width:900px){
          .gst-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .gst-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .gst-actions{width:100%; flex-wrap:wrap}
          .gst-content{padding:16px}
          .gst-stats-grid{grid-template-columns:1fr 1fr}
          .gst-table-card{overflow-x:auto}
          .gst-table{min-width:600px}
          .gst-control-bar{flex-direction:column; align-items:flex-start}
        }
        @media(max-width:600px){
          .gst-stats-grid{grid-template-columns:1fr}
          .gst-actions{flex-direction:column}
          .gst-actions button{width:100%; justify-content:center}
        }
      `}</style>

      <div className="gst-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="gst-main">
          {/* Topbar */}
          <div className="gst-top">
            <div>
              <div className="gst-top-title">GST Filing & Tax Hub</div>
              <div className="gst-top-sub">Auto-computed GSTR-1, GSTR-3B liability, JSON export & GST Portal payment guide</div>
            </div>

            <div className="gst-actions">
              <button className="gst-btn-secondary" onClick={handleExportCaCsv}>
                📊 Export CA Summary (CSV)
              </button>
              <button className="gst-btn-primary" onClick={handleExportGstr1Json}>
                📥 Download GSTR-1 JSON
              </button>
            </div>
          </div>

          <div className="gst-content">
            {/* Period Switcher */}
            <div className="gst-control-bar">
              <div className="gst-period-deck">
                <button className={`gst-period-btn ${period === 'current_month' ? 'active' : ''}`} onClick={() => setPeriod('current_month')}>Current Month</button>
                <button className={`gst-period-btn ${period === 'quarter' ? 'active' : ''}`} onClick={() => setPeriod('quarter')}>This Quarter</button>
                <button className={`gst-period-btn ${period === 'all' ? 'active' : ''}`} onClick={() => setPeriod('all')}>All Time</button>
              </div>

              <div style={{ fontSize: 11, color: 'rgba(26,20,13,.45)' }}>
                GSTIN: <strong style={{ color: '#1B5E3B' }}>{profile.gstin || '36ABCDE1234F1Z5 (Sample)'}</strong>
              </div>
            </div>

            {/* Metrics Motion Grid */}
            <div className="gst-stats-grid">
              <div className="gst-stat-card">
                <div className="gst-stat-label">Total Sales Turnover</div>
                <div className="gst-stat-val">{fmtINR(taxMetrics.totalTurnover)}</div>
                <div className="gst-stat-sub">From {taxMetrics.totalInvoices} sales invoices</div>
              </div>

              <div className="gst-stat-card">
                <div className="gst-stat-label">Net Taxable Value</div>
                <div className="gst-stat-val">{fmtINR(taxMetrics.totalTaxableValue)}</div>
                <div className="gst-stat-sub">Excludes 18% GST</div>
              </div>

              <div className="gst-stat-card">
                <div className="gst-stat-label">Total GST Output Tax</div>
                <div className="gst-stat-val" style={{ color: '#1B5E3B' }}>{fmtINR(taxMetrics.totalGstLiability)}</div>
                <div className="gst-stat-sub">CGST + SGST + IGST liability</div>
              </div>

              <div className="gst-stat-card">
                <div className="gst-stat-label">B2B vs B2C Split</div>
                <div className="gst-stat-val" style={{ fontSize: 18 }}>{taxMetrics.b2bCount} B2B / {taxMetrics.b2cCount} B2C</div>
                <div className="gst-stat-sub">{taxMetrics.b2bCount} invoices with GSTIN</div>
              </div>
            </div>

            {/* Banner */}
            <div className="gst-banner">
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1B5E3B' }}>⚡ Ready to File GSTR-1 for {period === 'current_month' ? 'This Month' : 'Selected Period'}</div>
                <div style={{ fontSize: 11, color: 'rgba(26,20,13,.5)', marginTop: 2 }}>
                  Download GSTR-1 JSON payload and import it directly into the official GST Portal offline tool.
                </div>
              </div>
              <button className="gst-btn-primary" onClick={handleExportGstr1Json}>
                📥 Download GSTR-1 JSON
              </button>
            </div>

            {/* Tabs */}
            <div className="gst-tabs-deck">
              <button className={`gst-tab-btn ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
                📊 Tax Liability Summary (GSTR-3B)
              </button>
              <button className={`gst-tab-btn ${activeTab === 'b2b' ? 'active' : ''}`} onClick={() => setActiveTab('b2b')}>
                📄 B2B Invoice Directory ({taxMetrics.b2bCount})
              </button>
              <button className={`gst-tab-btn ${activeTab === 'hsn' ? 'active' : ''}`} onClick={() => setActiveTab('hsn')}>
                📑 HSN / SAC Summary
              </button>
              <button className={`gst-tab-btn ${activeTab === 'advancetax' ? 'active' : ''}`} onClick={() => setActiveTab('advancetax')}>
                📈 Advance Tax & Sec 44ADA
              </button>
              <button className={`gst-tab-btn ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
                💳 GST Portal Payment & Challan Guide
              </button>
            </div>

            {/* Panel Content */}
            <div className="gst-panel">
              {/* TAB 1: SUMMARY */}
              {activeTab === 'summary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1A140D' }}>GSTR-3B Tax Computation Breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>Central Tax (CGST 9%)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1A140D', marginTop: 4 }}>{fmtINR(taxMetrics.totalCgst)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(26,20,13,.4)', marginTop: 2 }}>Intra-state sales within Telangana/AP</div>
                    </div>

                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>State Tax (SGST 9%)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1A140D', marginTop: 4 }}>{fmtINR(taxMetrics.totalSgst)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(26,20,13,.4)', marginTop: 2 }}>Intra-state sales within Telangana/AP</div>
                    </div>

                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>Integrated Tax (IGST 18%)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#185FA5', marginTop: 4 }}>{fmtINR(taxMetrics.totalIgst)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(26,20,13,.4)', marginTop: 2 }}>Inter-state sales across India</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: B2B DIRECTORY */}
              {activeTab === 'b2b' && (
                <div>
                  <table className="gst-table">
                    <thead>
                      <tr>
                        <th className="gst-th">Invoice #</th>
                        <th className="gst-th">Date</th>
                        <th className="gst-th">Client</th>
                        <th className="gst-th">GSTIN</th>
                        <th className="gst-th">Taxable Val</th>
                        <th className="gst-th">Tax Amt</th>
                        <th className="gst-th" style={{ textAlign: 'right' }}>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => (
                        <tr key={inv.id} className="gst-tr">
                          <td className="gst-td" style={{ fontWeight: 600, color: '#1B5E3B' }}>{inv.invoice_number}</td>
                          <td className="gst-td">{fmtDate(inv.issue_date)}</td>
                          <td className="gst-td" style={{ fontWeight: 600 }}>{inv.clients?.name || 'Client'}</td>
                          <td className="gst-td">
                            {inv.clients?.gstin ? (
                              <span style={{ fontFamily: 'monospace', fontSize: 11, background: 'rgba(27,94,59,.08)', color: '#1B5E3B', padding: '2px 6px', borderRadius: 4 }}>
                                {inv.clients.gstin}
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: 'rgba(26,20,13,.4)' }}>B2C Unregistered</span>
                            )}
                          </td>
                          <td className="gst-td">{fmtINR(inv.subtotal || 0)}</td>
                          <td className="gst-td">{fmtINR(inv.tax_amount || 0)}</td>
                          <td className="gst-td" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtINR(inv.total_amount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: HSN SUMMARY */}
              {activeTab === 'hsn' && (
                <div>
                  <table className="gst-table">
                    <thead>
                      <tr>
                        <th className="gst-th">HSN / SAC Code</th>
                        <th className="gst-th">Description</th>
                        <th className="gst-th">Total Qty</th>
                        <th className="gst-th">Taxable Amount</th>
                        <th className="gst-th" style={{ textAlign: 'right' }}>Total Tax (18%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hsnSummary.map(item => (
                        <tr key={item.code} className="gst-tr">
                          <td className="gst-td" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B5E3B' }}>{item.code}</td>
                          <td className="gst-td">{item.desc}</td>
                          <td className="gst-td">{item.totalQty}</td>
                          <td className="gst-td">{fmtINR(item.taxableVal)}</td>
                          <td className="gst-td" style={{ textAlign: 'right', fontWeight: 700, color: '#1B5E3B' }}>{fmtINR(item.taxVal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 4: ADVANCE TAX & SECTION 44ADA PLANNER */}
              {activeTab === 'advancetax' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A140D' }}>
                        Income Tax & Section 44ADA Presumptive Taxation Planner
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(26,20,13,.5)', marginTop: 2 }}>
                        For IT Consultants, Agencies & Freelancers (50% presumptive profit margin on gross receipts up to ₹75L).
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: advanceTaxCalc.isAdvanceTaxMandatory ? 'rgba(192,57,43,.1)' : 'rgba(27,94,59,.1)', color: advanceTaxCalc.isAdvanceTaxMandatory ? '#C0392B' : '#1B5E3B' }}>
                      {advanceTaxCalc.isAdvanceTaxMandatory ? '⚠️ Advance Tax Mandatory (> ₹10k)' : '✓ Below Advance Tax Limit'}
                    </span>
                  </div>

                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>Gross Receipts (FY)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1A140D', marginTop: 4 }}>{fmtINR(advanceTaxCalc.grossReceipts)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(26,20,13,.4)', marginTop: 2 }}>Total taxable sales billed</div>
                    </div>

                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>44ADA Profit (50%)</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1B5E3B', marginTop: 4 }}>{fmtINR(advanceTaxCalc.profit44ADA)}</div>
                      <div style={{ fontSize: 10, color: '#1B5E3B', marginTop: 2 }}>Presumptive Taxable Net Income</div>
                    </div>

                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>Reconciled TDS Credit</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#185FA5', marginTop: 4 }}>−{fmtINR(advanceTaxCalc.approxTdsDeducted)}</div>
                      <div style={{ fontSize: 10, color: '#185FA5', marginTop: 2 }}>Form 26AS Tax Asset with ITD</div>
                    </div>

                    <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(26,20,13,.4)', textTransform: 'uppercase' }}>Net Advance Tax Payable</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: advanceTaxCalc.netTaxPayable > 0 ? '#C0392B' : '#1B5E3B', marginTop: 4 }}>
                        {fmtINR(advanceTaxCalc.netTaxPayable)}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(26,20,13,.4)', marginTop: 2 }}>Estimated balance payable</div>
                    </div>
                  </div>

                  {/* 4 Quarterly Installments */}
                  <div style={{ background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A140D', marginBottom: 12 }}>
                      🗓️ Statutory Advance Tax Installment Schedule (Section 208 / 211)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      <div style={{ background: 'rgba(26,20,13,.02)', border: '1px solid rgba(26,20,13,.06)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1A140D' }}>1st Installment (15%)</div>
                        <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)', marginTop: 2 }}>Due by <strong>June 15</strong></div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A140D', marginTop: 6 }}>{fmtINR(advanceTaxCalc.q1Due)}</div>
                      </div>

                      <div style={{ background: 'rgba(26,20,13,.02)', border: '1px solid rgba(26,20,13,.06)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1A140D' }}>2nd Installment (45%)</div>
                        <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)', marginTop: 2 }}>Due by <strong>Sept 15</strong></div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A140D', marginTop: 6 }}>{fmtINR(advanceTaxCalc.q2Due)}</div>
                      </div>

                      <div style={{ background: 'rgba(26,20,13,.02)', border: '1px solid rgba(26,20,13,.06)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1A140D' }}>3rd Installment (75%)</div>
                        <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)', marginTop: 2 }}>Due by <strong>Dec 15</strong></div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A140D', marginTop: 6 }}>{fmtINR(advanceTaxCalc.q3Due)}</div>
                      </div>

                      <div style={{ background: 'rgba(26,20,13,.02)', border: '1px solid rgba(26,20,13,.06)', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#1B5E3B' }}>4th Installment (100%)</div>
                        <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)', marginTop: 2 }}>Due by <strong>March 15</strong></div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1B5E3B', marginTop: 6 }}>{fmtINR(advanceTaxCalc.q4Due)}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: '1px dashed rgba(26,20,13,.1)' }}>
                      <div style={{ fontSize: 11, color: 'rgba(26,20,13,.55)' }}>
                        💡 <em>Section 44ADA benefit: Professionals opting for presumptive scheme can pay 100% advance tax in a single installment on or before March 15 without Section 234C interest penalty.</em>
                      </div>
                      <a
                        href="https://eportal.incometax.gov.in/iec/foservices/#/e-pay-tax-prelogin/user-details"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gst-btn-primary"
                        style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        💳 Pay Challan 280 (e-Pay Tax) →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GST PAYMENT GUIDE */}
              {activeTab === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A140D' }}>Official GST Portal Challan & Tax Payment Guide</div>
                  <div style={{ fontSize: 12, color: 'rgba(26,20,13,.6)', lineHeight: 1.6 }}>
                    Follow these 4 simple steps to pay your monthly GST output tax on the official Government portal:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { step: '1', title: 'Log in to GST Portal', desc: 'Go to services.gst.gov.in and log in with your GSTIN username & password.' },
                      { step: '2', title: 'Generate Payment Challan', desc: 'Navigate to Services → Payments → Create Challan. Select "Monthly Payment".' },
                      { step: '3', title: 'Enter Tax Amounts', desc: `Enter CGST (${fmtINR(taxMetrics.totalCgst)}), SGST (${fmtINR(taxMetrics.totalSgst)}), and IGST (${fmtINR(taxMetrics.totalIgst)}) under Net Tax Payable.` },
                      { step: '4', title: 'Pay via NetBanking / UPI', desc: 'Select E-Payment (UPI / NetBanking) and complete the payment to generate your CPIN receipt.' },
                    ].map(s => (
                      <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10, padding: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1B5E3B', color: 'white', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {s.step}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1A140D' }}>{s.title}</div>
                          <div style={{ fontSize: 11, color: 'rgba(26,20,13,.55)', marginTop: 2 }}>{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <a
                      className="gst-btn-primary"
                      href="https://services.gst.gov.in/services/quicklinks/payments"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      🔗 Open Official GST Payment Portal →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
