'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  vendor_name: string | null
  expense_date: string
  payment_method: string
  gst_amount: number
  notes: string | null
  created_at: string
}

interface Props {
  expenses: Expense[]
  userName: string
  userEmail: string
  userId: string
}

const CATEGORIES = [
  { value: 'office', label: 'Office & Rent', icon: '🏢' },
  { value: 'travel', label: 'Travel & Fuel', icon: '✈️' },
  { value: 'software', label: 'Software & Tools', icon: '💻' },
  { value: 'hardware', label: 'Hardware', icon: '🖥️' },
  { value: 'salaries', label: 'Salaries & Payroll', icon: '👥' },
  { value: 'marketing', label: 'Marketing & Ads', icon: '📢' },
  { value: 'professional', label: 'Professional Services', icon: '⚖️' },
  { value: 'utilities', label: 'Utilities & Internet', icon: '🔌' },
  { value: 'general', label: 'General / Other', icon: '📦' },
]

const METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
]

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
    year: 'numeric',
  })
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function ExpensesPage({
  expenses: initialExpenses,
  userName,
  userEmail,
  userId,
}: Props) {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')

  // AI OCR Scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [aiExtracted, setAiExtracted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState({
    category: 'general',
    description: '',
    amount: '',
    vendor_name: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'upi',
    gst_amount: '',
    notes: '',
  })

  const filtered = useMemo(() => {
    if (filterCat === 'all') return expenses
    return expenses.filter((e) => e.category === filterCat)
  }, [expenses, filterCat])

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses]
  )
  const totalGst = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.gst_amount || 0), 0),
    [expenses]
  )
  const thisMonthTotal = useMemo(() => {
    const now = new Date()
    return expenses
      .filter((e) => {
        const d = new Date(e.expense_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((s, e) => s + Number(e.amount), 0)
  }, [expenses])

  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [expenses])

  // Handle Receipt Upload / Camera Capture
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    setAiExtracted(false)

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1]
        setScanPreview(reader.result as string)

        const res = await fetch('/api/expenses/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            mimeType: file.type || 'image/jpeg',
          }),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to scan bill')

        const ext = json.extracted
        if (ext) {
          setForm({
            category: ext.category || 'general',
            description: ext.description || `${ext.vendor_name || 'Expense'} bill`,
            amount: ext.amount ? String(ext.amount) : '',
            vendor_name: ext.vendor_name || '',
            expense_date: ext.expense_date || new Date().toISOString().split('T')[0],
            payment_method: ext.payment_method || 'upi',
            gst_amount: ext.gst_amount ? String(ext.gst_amount) : '',
            notes: ext.notes || (ext.vendor_gstin ? `Vendor GSTIN: ${ext.vendor_gstin}` : ''),
          })
          setAiExtracted(true)
          setShowModal(true)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error scanning receipt. Please enter details manually.')
    } finally {
      setIsScanning(false)
      // reset file input
      if (e.target) e.target.value = ''
    }
  }

  const handleSave = async () => {
    if (!form.description || !form.amount) return
    setSaving(true)
    try {
      const sb = getSupabase()
      const { data, error } = await sb
        .from('expenses')
        .insert({
          user_id: userId,
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount),
          vendor_name: form.vendor_name || null,
          expense_date: form.expense_date,
          payment_method: form.payment_method,
          gst_amount: form.gst_amount ? parseFloat(form.gst_amount) : 0,
          notes: form.notes || null,
        })
        .select()
        .single()

      if (error) throw error
      if (data) setExpenses((prev) => [data, ...prev])
      setShowModal(false)
      setForm({
        category: 'general',
        description: '',
        amount: '',
        vendor_name: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'upi',
        gst_amount: '',
        notes: '',
      })
      setAiExtracted(false)
      setScanPreview(null)
    } catch (e) {
      console.error(e)
      alert('Failed to save. Make sure the expenses table exists in Supabase.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    const sb = getSupabase()
    await sb.from('expenses').delete().eq('id', id)
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const catIcon = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.icon || '📦'
  const catLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat

  return (
    <>
      <style>{`
        .ex-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .ex-main{flex:1;margin-left:220px;display:flex;flex-direction:column;min-height:100vh}
        .ex-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .ex-title{font-size:22px;font-weight:800;color:#FFF}
        .ex-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .ex-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:20px;max-width:1440px;width:100%;margin:0 auto}

        .ex-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .ex-stat{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .ex-stat:hover{transform:translateY(-3px);border-color:rgba(16,185,129,.35);box-shadow:0 20px 40px -15px rgba(0,0,0,.7),0 0 20px rgba(16,185,129,.15)}
        .ex-stat-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
        .ex-stat-val{font-size:24px;font-weight:800;color:#FFF;letter-spacing:-.02em}
        .ex-stat-sub{font-size:10px;color:rgba(255,255,255,.4);margin-top:4px}

        .ex-scan-banner{
          background: linear-gradient(135deg, rgba(16,185,129,.12), rgba(5,150,105,.04));
          border: 1px dashed rgba(16,185,129,.4);
          border-radius: 18px; padding: 22px 28px;
          display: flex; justify-content: space-between; align-items: center; gap: 20px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,.4);
        }
        .ex-scan-title{font-size: 16px; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 8px;}
        .ex-scan-desc{font-size: 12px; color: rgba(255,255,255,.55); margin-top: 4px;}

        .ex-filters{display:flex;gap:6px;flex-wrap:wrap}
        .ex-filter-btn{padding:6px 14px;font-size:11px;font-weight:600;border-radius:100px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.5);cursor:pointer;transition:all .15s;font-family:'Outfit',sans-serif}
        .ex-filter-btn.active{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.4);color:#34D399}

        .ex-table-card{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden}
        .ex-table{width:100%;border-collapse:collapse}
        .ex-th{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;padding:14px 18px;text-align:left;border-bottom:1px solid rgba(255,255,255,.06)}
        .ex-td{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px;color:#F3F4F6;vertical-align:middle}
        .ex-tr{transition:background .15s}
        .ex-tr:hover{background:rgba(255,255,255,.03)}
        .ex-del{background:none;border:none;color:rgba(248,113,113,.6);cursor:pointer;font-size:11px;font-weight:600;font-family:'Outfit',sans-serif;padding:4px 8px;border-radius:6px;transition:all .15s}
        .ex-del:hover{background:rgba(248,113,113,.15);color:#F87171}

        .ex-cat-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
        .ex-empty{padding:40px;text-align:center;color:rgba(255,255,255,.4);font-size:13px}

        /* Modal */
        .ex-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(10px);z-index:100;display:flex;align-items:center;justify-content:center}
        .ex-modal{background:rgba(18,30,22,.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,.6)}
        .ex-modal-title{font-size:18px;font-weight:800;color:#FFF;margin-bottom:4px}
        .ex-modal-sub{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:20px}
        .ex-field-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;margin-top:14px}
        .ex-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;font-size:13px;color:#FFF;font-family:'Outfit',sans-serif;outline:none;transition:border .2s}
        .ex-input:focus{border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,.2)}
        .ex-input::placeholder{color:rgba(255,255,255,.3)}
        .ex-cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .ex-cat-btn{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-size:11px;font-weight:600;font-family:'Outfit',sans-serif;display:flex;align-items:center;gap:4px;justify-content:center;transition:all .15s}
        .ex-cat-btn.sel{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.4);color:#34D399}
        .ex-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ex-modal-actions{display:flex;gap:10px;margin-top:20px}
        .ex-modal-cancel{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif}
        .ex-modal-save{flex:2;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#10B981,#059669);color:#FFF;cursor:pointer;font-size:13px;font-weight:700;font-family:'Outfit',sans-serif;box-shadow:0 4px 16px rgba(16,185,129,.35);transition:all .2s}
        .ex-modal-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 25px rgba(16,185,129,.5)}
        .ex-modal-save:disabled{opacity:.6;cursor:not-allowed}

        /* Scanning overlay */
        .ex-scan-modal{
          background: rgba(14,24,18,.95);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(16,185,129,.3);
          border-radius: 24px; padding: 36px;
          text-align: center; max-width: 420px; width: 90vw;
          box-shadow: 0 0 50px rgba(16,185,129,.25);
        }
        .ex-laser-box{
          width: 140px; height: 140px; margin: 0 auto 20px;
          border-radius: 20px; border: 2px solid rgba(16,185,129,.4);
          position: relative; overflow: hidden;
          background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center;
        }
        .ex-laser-line{
          position: absolute; left: 0; right: 0; height: 3px;
          background: #10B981; box-shadow: 0 0 15px #10B981;
          animation: ex-laser-anim 1.5s infinite ease-in-out;
        }
        @keyframes ex-laser-anim{
          0%, 100%{ top: 5%; opacity: .3; }
          50%{ top: 90%; opacity: 1; }
        }

        .ex-ai-badge{
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700;
          background: rgba(16,185,129,.15); color: #34D399; border: 1px solid rgba(16,185,129,.3);
          margin-bottom: 12px;
        }

        @media(max-width:1024px){
          .ex-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .ex-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .ex-content{padding:16px}
          .ex-stats{grid-template-columns:1fr 1fr}
          .ex-scan-banner{flex-direction:column; align-items:stretch}
          .ex-table-wrap{overflow-x:auto}
          .ex-table{min-width:580px}
          .ex-filters{overflow-x:auto; padding-bottom:4px; width:100%}
          .ex-modal{width:100%; max-width:calc(100vw - 24px); padding:20px}
        }
        @media(max-width:640px){
          .ex-stats{grid-template-columns:1fr}
          .ex-top{flex-direction:column; align-items:flex-start}
          .ex-top div:last-child{width:100%; display:flex; gap:8px}
          .ex-top div:last-child button{flex:1; justify-content:center}
        }
      `}</style>

      {/* Hidden file & camera inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelected}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      <div className="ex-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="ex-main">
          <div className="ex-top">
            <div>
              <div className="ex-title">Expense Tracking</div>
              <div className="ex-sub">Track business expenses for profit/loss and GST Input Tax Credit (ITC)</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="kokonut-btn-secondary"
                onClick={() => cameraInputRef.current?.click()}
                title="Capture receipt photo on mobile"
              >
                📷 Take Photo
              </button>
              <button
                className="kokonut-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                title="Upload receipt PDF or image"
              >
                📸 Scan Bill / Receipt
              </button>
              <button className="kokonut-btn-primary" onClick={() => setShowModal(true)}>
                + Add Expense
              </button>
            </div>
          </div>

          <div className="ex-content">
            {/* AI Bill Scanner Quick Banner */}
            <div className="ex-scan-banner">
              <div>
                <div className="ex-scan-title">
                  <span>📸 AI Instant Bill & Receipt Scanner</span>
                  <span style={{ fontSize: 10, background: '#10B981', color: '#000', padding: '2px 8px', borderRadius: 100, fontWeight: 800 }}>AI OCR</span>
                </div>
                <div className="ex-scan-desc">
                  Snap a photo on your mobile phone or upload any paper invoice/fuel bill. AI will automatically extract the vendor, date, GST amount, and category in seconds!
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <button
                  className="kokonut-btn-primary"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📷 Camera Snap
                </button>
                <button
                  className="kokonut-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Upload Bill
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="ex-stats">
              <div className="ex-stat">
                <div className="ex-stat-label">Total Expenses (All Time)</div>
                <div className="ex-stat-val" style={{ color: '#F87171' }}>{fmtINR(totalExpenses)}</div>
                <div className="ex-stat-sub">{expenses.length} entries recorded</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-label">This Month</div>
                <div className="ex-stat-val">{fmtINR(thisMonthTotal)}</div>
                <div className="ex-stat-sub">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-label">GST ITC Claimable</div>
                <div className="ex-stat-val" style={{ color: '#34D399' }}>{fmtINR(totalGst)}</div>
                <div className="ex-stat-sub">Input Tax Credit from vendors</div>
              </div>
              <div className="ex-stat">
                <div className="ex-stat-label">Top Category</div>
                <div className="ex-stat-val" style={{ fontSize: 16 }}>{catBreakdown[0] ? `${catIcon(catBreakdown[0][0])} ${catLabel(catBreakdown[0][0])}` : '—'}</div>
                <div className="ex-stat-sub">{catBreakdown[0] ? fmtINR(catBreakdown[0][1]) : 'No expenses yet'}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="ex-filters">
              <button className={`ex-filter-btn ${filterCat === 'all' ? 'active' : ''}`} onClick={() => setFilterCat('all')}>All</button>
              {CATEGORIES.map(c => (
                <button key={c.value} className={`ex-filter-btn ${filterCat === c.value ? 'active' : ''}`} onClick={() => setFilterCat(c.value)}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="ex-table-card">
              {filtered.length === 0 ? (
                <div className="ex-empty">
                  {expenses.length === 0 ? 'No expenses recorded yet. Snap a photo or click "+ Add Expense" to start tracking.' : 'No expenses in this category.'}
                </div>
              ) : (
                <table className="ex-table">
                  <thead>
                    <tr>
                      <th className="ex-th">Date</th>
                      <th className="ex-th">Category</th>
                      <th className="ex-th">Description</th>
                      <th className="ex-th">Vendor</th>
                      <th className="ex-th">Method</th>
                      <th className="ex-th" style={{ textAlign: 'right' }}>GST</th>
                      <th className="ex-th" style={{ textAlign: 'right' }}>Amount</th>
                      <th className="ex-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(exp => (
                      <tr key={exp.id} className="ex-tr">
                        <td className="ex-td" style={{ whiteSpace: 'nowrap' }}>{fmtDate(exp.expense_date)}</td>
                        <td className="ex-td"><span className="ex-cat-badge">{catIcon(exp.category)} {catLabel(exp.category)}</span></td>
                        <td className="ex-td" style={{ fontWeight: 600 }}>{exp.description}</td>
                        <td className="ex-td" style={{ color: 'rgba(255,255,255,.5)' }}>{exp.vendor_name || '—'}</td>
                        <td className="ex-td" style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>{METHODS.find(m => m.value === exp.payment_method)?.label || exp.payment_method}</td>
                        <td className="ex-td" style={{ textAlign: 'right', color: '#34D399' }}>{exp.gst_amount ? fmtINR(exp.gst_amount) : '—'}</td>
                        <td className="ex-td" style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{fmtINR(exp.amount)}</td>
                        <td className="ex-td"><button className="ex-del" onClick={() => handleDelete(exp.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Laser Scanning Animation Modal */}
      {isScanning && (
        <div className="ex-overlay">
          <div className="ex-scan-modal">
            <div className="ex-laser-box">
              {scanPreview ? (
                <img src={scanPreview} alt="Receipt preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
              ) : (
                <span style={{ fontSize: 40 }}>🧾</span>
              )}
              <div className="ex-laser-line" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF' }}>Scanning Receipt with AI...</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 6 }}>
              Extracting vendor details, amount, date & GST breakdown
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      {showModal && (
        <div className="ex-overlay" onClick={() => setShowModal(false)}>
          <div className="ex-modal" onClick={e => e.stopPropagation()}>
            <div className="ex-modal-title">
              {aiExtracted ? '✨ Review Scanned Expense' : 'Add New Expense'}
            </div>
            <div className="ex-modal-sub">
              {aiExtracted
                ? 'AI automatically extracted these details. Review and save.'
                : 'Record a business expense for tracking and GST ITC claims'}
            </div>

            {aiExtracted && (
              <div className="ex-ai-badge">
                <span>✨ Auto-Extracted via AI OCR</span>
              </div>
            )}

            <div className="ex-field-label">Category</div>
            <div className="ex-cat-grid">
              {CATEGORIES.map(c => (
                <button key={c.value} className={`ex-cat-btn ${form.category === c.value ? 'sel' : ''}`} onClick={() => setForm(f => ({ ...f, category: c.value }))}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            <div className="ex-field-label">Description / Items</div>
            <input className="ex-input" placeholder="e.g. AWS hosting bill, Starbucks client meeting" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

            <div className="ex-row2">
              <div>
                <div className="ex-field-label">Total Amount (₹)</div>
                <input className="ex-input" type="number" placeholder="5000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <div className="ex-field-label">GST Tax Amount (₹)</div>
                <input className="ex-input" type="number" placeholder="900" value={form.gst_amount} onChange={e => setForm(f => ({ ...f, gst_amount: e.target.value }))} />
              </div>
            </div>

            <div className="ex-row2">
              <div>
                <div className="ex-field-label">Vendor / Merchant</div>
                <input className="ex-input" placeholder="Amazon Web Services" value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
              </div>
              <div>
                <div className="ex-field-label">Expense Date</div>
                <input className="ex-input" type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
            </div>

            <div className="ex-field-label">Payment Method</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {METHODS.map(m => (
                <button key={m.value} className={`ex-cat-btn ${form.payment_method === m.value ? 'sel' : ''}`} onClick={() => setForm(f => ({ ...f, payment_method: m.value }))}>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="ex-field-label">Notes (Optional)</div>
            <input className="ex-input" placeholder="GSTIN, invoice number, or tax notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

            <div className="ex-modal-actions">
              <button className="ex-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ex-modal-save" onClick={handleSave} disabled={saving || !form.description || !form.amount}>
                {saving ? 'Saving...' : '✓ Confirm & Save Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
