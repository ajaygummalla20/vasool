'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  whatsapp: string | null
}

interface TemplateItem {
  id: string
  description: string
  qty: number
  unit: string
  rate: number
}

interface RecurringTemplate {
  id: string
  title: string
  client_id: string | null
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  next_due: string
  amount: number
  tax_rate: number
  items: TemplateItem[] | null
  payment_terms: string | null
  notes: string | null
  is_active: boolean
  last_generated_at: string | null
  created_at: string
  clients: { name: string; company_name: string | null; email: string | null } | null
}

interface Props {
  templates: RecurringTemplate[]
  clients: Client[]
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

const uid = () => Math.random().toString(36).slice(2, 8)

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

export default function RecurringPage({
  templates: initialTemplates,
  clients,
  userName,
  userEmail,
  userId,
}: Props) {
  const router = useRouter()
  const [templates, setTemplates] = useState<RecurringTemplate[]>(initialTemplates)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    title: '',
    client_id: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    next_due: (() => {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      return d.toISOString().split('T')[0]
    })(),
    payment_terms: 'Net 15',
    notes: 'Recurring retainer services invoice.',
  })

  const [items, setItems] = useState<TemplateItem[]>([
    { id: uid(), description: 'Monthly Retainer Maintenance', qty: 1, unit: 'mo', rate: 25000 },
  ])

  const computedSubtotal = useMemo(() => {
    return items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0)
  }, [items])

  // MRR and stats
  const stats = useMemo(() => {
    const active = templates.filter((t) => t.is_active)
    let mrr = 0
    active.forEach((t) => {
      const amt = Number(t.amount) || 0
      if (t.frequency === 'weekly') mrr += amt * 4.33
      else if (t.frequency === 'monthly') mrr += amt
      else if (t.frequency === 'quarterly') mrr += amt / 3
      else if (t.frequency === 'yearly') mrr += amt / 12
    })
    return {
      activeCount: active.length,
      totalCount: templates.length,
      mrr: Math.round(mrr),
      annualized: Math.round(mrr * 12),
    }
  }, [templates])

  const handleSave = async () => {
    if (!form.title.trim() || !form.client_id) {
      alert('Please fill in the retainer title and select a client.')
      return
    }
    setSaving(true)
    try {
      const sb = getSupabase()
      const payload = {
        user_id: userId,
        client_id: form.client_id,
        title: form.title,
        frequency: form.frequency,
        next_due: form.next_due,
        amount: computedSubtotal,
        tax_rate: 18,
        items,
        payment_terms: form.payment_terms,
        notes: form.notes,
        is_active: true,
      }

      const { data, error } = await sb
        .from('recurring_templates')
        .insert(payload)
        .select('*, clients ( name, company_name, email )')
        .single()

      if (error) throw error
      if (data) setTemplates((prev) => [data as any, ...prev])
      setShowModal(false)
      // reset form
      setForm({
        title: '',
        client_id: '',
        frequency: 'monthly',
        next_due: new Date().toISOString().split('T')[0],
        payment_terms: 'Net 15',
        notes: 'Recurring retainer services invoice.',
      })
      setItems([{ id: uid(), description: 'Monthly Retainer', qty: 1, unit: 'mo', rate: 25000 }])
    } catch (e) {
      console.error(e)
      alert('Failed to save recurring template. Check Supabase connection.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (tpl: RecurringTemplate) => {
    const sb = getSupabase()
    const updatedStatus = !tpl.is_active
    await sb.from('recurring_templates').update({ is_active: updatedStatus }).eq('id', tpl.id)
    setTemplates((prev) =>
      prev.map((t) => (t.id === tpl.id ? { ...t, is_active: updatedStatus } : t))
    )
  }

  const handleGenerateInvoice = async (tpl: RecurringTemplate) => {
    setGeneratingId(tpl.id)
    try {
      const query = new URLSearchParams()
      if (tpl.client_id) query.set('client_id', tpl.client_id)
      if (tpl.payment_terms) query.set('terms', tpl.payment_terms)
      if (tpl.notes) query.set('notes', tpl.notes)
      router.push(`/dashboard/invoices/new?${query.toString()}`)
    } finally {
      setGeneratingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring schedule?')) return
    const sb = getSupabase()
    await sb.from('recurring_templates').delete().eq('id', id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <>
      <style>{`
        .rc-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .rc-main{flex:1;margin-left:220px;display:flex;flex-direction:column}
        .rc-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .rc-title{font-size:22px;font-weight:800;color:#FFF}
        .rc-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .rc-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:20px;max-width:1440px;width:100%;margin:0 auto}

        .rc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
        .rc-stat{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .rc-stat:hover{transform:translateY(-3px);border-color:rgba(16,185,129,.35);box-shadow:0 20px 40px -15px rgba(0,0,0,.7)}
        .rc-stat-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
        .rc-stat-val{font-size:24px;font-weight:800;color:#FFF;letter-spacing:-.02em}
        .rc-stat-sub{font-size:10px;color:rgba(255,255,255,.4);margin-top:4px}

        .rc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}
        .rc-card{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .rc-card:hover{transform:translateY(-3px);border-color:rgba(16,185,129,.3);box-shadow:0 20px 40px -15px rgba(0,0,0,.7)}
        .rc-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
        .rc-card-title{font-size:16px;font-weight:700;color:#FFF}
        .rc-card-client{font-size:12px;color:rgba(255,255,255,.5);margin-top:4px}
        .rc-card-freq{display:inline-block;padding:3px 10px;border-radius:100px;font-size:10px;font-weight:700;background:rgba(16,185,129,.15);color:#34D399;border:1px solid rgba(16,185,129,.3)}
        .rc-card-amount{font-size:22px;font-weight:800;color:#FFF;margin-top:12px}
        .rc-card-meta{display:flex;justify-content:space-between;margin-top:12px;font-size:11px;color:rgba(255,255,255,.4);background:rgba(255,255,255,.03);padding:8px 12px;border-radius:8px}
        
        .rc-card-actions{display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06)}
        .rc-btn-gen{flex:2;padding:9px;border-radius:9px;border:none;background:linear-gradient(135deg,#10B981,#059669);color:#FFF;font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;box-shadow:0 4px 12px rgba(16,185,129,.3);transition:all .15s}
        .rc-btn-gen:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(16,185,129,.4)}
        .rc-btn-toggle{flex:1;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.6);font-size:11px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif}
        .rc-btn-del{padding:9px 12px;border-radius:9px;border:1px solid rgba(248,113,113,.2);background:transparent;color:rgba(248,113,113,.7);font-size:11px;cursor:pointer}

        .rc-empty{padding:60px;text-align:center;color:rgba(255,255,255,.4);font-size:14px}

        /* Modal */
        .rc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center}
        .rc-modal{background:rgba(18,30,22,.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto}
        .rc-modal-title{font-size:18px;font-weight:800;color:#FFF;margin-bottom:4px}
        .rc-modal-sub{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:20px}
        .rc-field-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;margin-top:14px}
        .rc-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;font-size:13px;color:#FFF;font-family:'Outfit',sans-serif;outline:none}
        .rc-input:focus{border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,.2)}
        .rc-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

        @media(max-width:1024px){
          .rc-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .rc-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .rc-content{padding:16px}
          .rc-stats{grid-template-columns:1fr 1fr}
          .rc-grid{grid-template-columns:1fr}
          .rc-row2{grid-template-columns:1fr}
          .rc-modal{padding:18px; width:100%; max-width:calc(100vw - 20px)}
        }
        @media(max-width:600px){
          .rc-stats{grid-template-columns:1fr}
          .rc-top button{width:100%; justify-content:center}
          .rc-card-actions{flex-wrap:wrap}
        }
      `}</style>

      <div className="rc-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="rc-main">
          <div className="rc-top">
            <div>
              <div className="rc-title">Recurring Invoices & Retainers</div>
              <div className="rc-sub">
                Automate periodic billing for retainer contracts, AMC agreements, and SaaS subscriptions
              </div>
            </div>
            <button
              style={{
                background: 'linear-gradient(135deg,#10B981,#059669)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                color: '#FFF',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'Outfit',sans-serif",
                boxShadow: '0 4px 16px rgba(16,185,129,.35)',
              }}
              onClick={() => setShowModal(true)}
            >
              + New Retainer Schedule
            </button>
          </div>

          <div className="rc-content">
            {/* Stats */}
            <div className="rc-stats">
              <div className="rc-stat">
                <div className="rc-stat-label">Active Retainers</div>
                <div className="rc-stat-val" style={{ color: '#34D399' }}>
                  {stats.activeCount}
                </div>
                <div className="rc-stat-sub">of {stats.totalCount} total schedules</div>
              </div>
              <div className="rc-stat">
                <div className="rc-stat-label">Estimated MRR</div>
                <div className="rc-stat-val" style={{ color: '#FFF' }}>
                  {fmtINR(stats.mrr)}
                </div>
                <div className="rc-stat-sub">Monthly Recurring Revenue</div>
              </div>
              <div className="rc-stat">
                <div className="rc-stat-label">Annual Run Rate (ARR)</div>
                <div className="rc-stat-val" style={{ color: '#60A5FA' }}>
                  {fmtINR(stats.annualized)}
                </div>
                <div className="rc-stat-sub">Projected annual retainer cashflow</div>
              </div>
              <div className="rc-stat">
                <div className="rc-stat-label">Next Invoice Due</div>
                <div className="rc-stat-val" style={{ fontSize: 18 }}>
                  {templates[0]?.next_due ? fmtDate(templates[0].next_due) : '—'}
                </div>
                <div className="rc-stat-sub">Earliest scheduled batch</div>
              </div>
            </div>

            {/* Retainers Grid */}
            {templates.length === 0 ? (
              <div className="rc-empty">
                No recurring retainers configured yet. Click "+ New Retainer Schedule" to automate your
                monthly invoices!
              </div>
            ) : (
              <div className="rc-grid">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="rc-card"
                    style={{ opacity: tpl.is_active ? 1 : 0.6 }}
                  >
                    <div className="rc-card-top">
                      <div>
                        <div className="rc-card-title">{tpl.title}</div>
                        <div className="rc-card-client">
                          {tpl.clients?.name || 'Client'}
                          {tpl.clients?.company_name ? ` (${tpl.clients.company_name})` : ''}
                        </div>
                      </div>
                      <span className="rc-card-freq">
                        {FREQUENCY_LABELS[tpl.frequency] || tpl.frequency}
                      </span>
                    </div>

                    <div className="rc-card-amount">{fmtINR(tpl.amount)}</div>

                    <div className="rc-card-meta">
                      <span>Next Run: {fmtDate(tpl.next_due)}</span>
                      <span>
                        Status:{' '}
                        <strong style={{ color: tpl.is_active ? '#34D399' : '#F87171' }}>
                          {tpl.is_active ? 'Active' : 'Paused'}
                        </strong>
                      </span>
                    </div>

                    <div className="rc-card-actions">
                      <button
                        className="rc-btn-gen"
                        onClick={() => handleGenerateInvoice(tpl)}
                        disabled={generatingId === tpl.id}
                      >
                        {generatingId === tpl.id ? 'Creating...' : '⚡ Generate Invoice Now'}
                      </button>
                      <button
                        className="rc-btn-toggle"
                        onClick={() => handleToggleActive(tpl)}
                      >
                        {tpl.is_active ? '⏸ Pause' : '▶ Resume'}
                      </button>
                      <button
                        className="rc-btn-del"
                        onClick={() => handleDelete(tpl.id)}
                        title="Delete schedule"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="rc-overlay" onClick={() => setShowModal(false)}>
          <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rc-modal-title">New Recurring Retainer</div>
            <div className="rc-modal-sub">Set up automatic invoicing for retainer clients</div>

            <div className="rc-field-label">Retainer / Agreement Title</div>
            <input
              className="rc-input"
              placeholder="e.g. Monthly Website Maintenance & SEO"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />

            <div className="rc-row2">
              <div>
                <div className="rc-field-label">Client</div>
                <select
                  className="rc-input"
                  value={form.client_id}
                  onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company_name ? `(${c.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="rc-field-label">Frequency</div>
                <select
                  className="rc-input"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      frequency: e.target.value as any,
                    }))
                  }
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="rc-row2">
              <div>
                <div className="rc-field-label">First Invoice Date</div>
                <input
                  className="rc-input"
                  type="date"
                  value={form.next_due}
                  onChange={(e) => setForm((f) => ({ ...f, next_due: e.target.value }))}
                />
              </div>
              <div>
                <div className="rc-field-label">Payment Terms</div>
                <input
                  className="rc-input"
                  placeholder="Net 15"
                  value={form.payment_terms}
                  onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                />
              </div>
            </div>

            <div className="rc-field-label">Line Items</div>
            {items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 60px 100px 30px',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <input
                  className="rc-input"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const n = [...items]
                    n[idx] = { ...n[idx], description: e.target.value }
                    setItems(n)
                  }}
                />
                <input
                  className="rc-input"
                  type="number"
                  placeholder="Qty"
                  value={item.qty || ''}
                  onChange={(e) => {
                    const n = [...items]
                    n[idx] = { ...n[idx], qty: Number(e.target.value) }
                    setItems(n)
                  }}
                />
                <input
                  className="rc-input"
                  type="number"
                  placeholder="Rate"
                  value={item.rate || ''}
                  onChange={(e) => {
                    const n = [...items]
                    n[idx] = { ...n[idx], rate: Number(e.target.value) }
                    setItems(n)
                  }}
                />
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#F87171',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                  onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              style={{
                fontSize: 11,
                color: '#34D399',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '4px 0',
              }}
              onClick={() =>
                setItems([...items, { id: uid(), description: '', qty: 1, unit: 'mo', rate: 0 }])
              }
            >
              + Add Item
            </button>

            <div
              style={{
                textAlign: 'right',
                fontSize: 16,
                fontWeight: 800,
                color: '#34D399',
                marginTop: 10,
              }}
            >
              Total Amount: {fmtINR(computedSubtotal)}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.12)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,.6)',
                  cursor: 'pointer',
                  fontFamily: "'Outfit',sans-serif",
                }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                style={{
                  flex: 2,
                  padding: 10,
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg,#10B981,#059669)',
                  color: '#FFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Outfit',sans-serif",
                }}
                onClick={handleSave}
                disabled={saving || !form.title}
              >
                {saving ? 'Saving...' : '✓ Create Retainer Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
