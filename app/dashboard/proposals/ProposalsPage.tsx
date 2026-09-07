'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

interface Client { id: string; name: string; company_name: string | null; email: string | null }
interface LineItem { id: string; description: string; qty: number; rate: number }

interface Proposal {
  id: string; proposal_number: string; title: string; status: string
  total_amount: number; valid_until: string | null; scope_of_work: string | null
  terms: string | null; notes: string | null; items: LineItem[] | null
  client_id: string | null; sent_at: string | null; accepted_at: string | null
  converted_invoice_id: string | null; created_at: string
  clients: { name: string }[] | null
}

interface Props {
  proposals: Proposal[]; clients: Client[]; userName: string
  userEmail: string; userId: string; previewNumber: string
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  draft:    { label: 'Draft',    bg: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)' },
  sent:     { label: 'Sent',     bg: 'rgba(59,130,246,.15)', color: '#60A5FA' },
  accepted: { label: 'Accepted', bg: 'rgba(16,185,129,.15)', color: '#34D399' },
  rejected: { label: 'Rejected', bg: 'rgba(248,113,113,.15)', color: '#F87171' },
  expired:  { label: 'Expired',  bg: 'rgba(251,191,36,.12)', color: '#FBBF24' },
}

function fmtINR(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) }
function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }
const uid = () => Math.random().toString(36).slice(2, 8)

function getSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export default function ProposalsPage({ proposals: initialProposals, clients, userName, userEmail, userId, previewNumber }: Props) {
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '', client_id: '', scope_of_work: '',
    valid_until: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })(),
    terms: '', notes: '',
  })
  const [items, setItems] = useState<LineItem[]>([{ id: uid(), description: '', qty: 1, rate: 0 }])

  const totalAmount = items.reduce((s, i) => s + i.qty * i.rate, 0)

  const stats = useMemo(() => {
    const total = proposals.length
    const sent = proposals.filter(p => p.status === 'sent').length
    const accepted = proposals.filter(p => p.status === 'accepted').length
    const totalVal = proposals.reduce((s, p) => s + Number(p.total_amount), 0)
    return { total, sent, accepted, totalVal }
  }, [proposals])

  const handleSave = async () => {
    if (!form.title) return
    setSaving(true)
    try {
      const sb = getSupabase()
      const { data, error } = await sb.from('proposals').insert({
        user_id: userId, proposal_number: previewNumber, title: form.title,
        client_id: form.client_id || null, total_amount: totalAmount,
        valid_until: form.valid_until || null, items: items.filter(i => i.description),
        scope_of_work: form.scope_of_work || null, terms: form.terms || null,
        notes: form.notes || null, status: 'draft',
      }).select('*, clients ( name )').single()

      if (error) throw error
      if (data) setProposals(prev => [data as any, ...prev])
      setShowModal(false)
      setForm({ title: '', client_id: '', scope_of_work: '', valid_until: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })(), terms: '', notes: '' })
      setItems([{ id: uid(), description: '', qty: 1, rate: 0 }])
    } catch (e) { console.error(e); alert('Failed to save. Make sure the proposals table exists in Supabase.') }
    finally { setSaving(false) }
  }

  const handleMarkSent = async (id: string) => {
    const sb = getSupabase()
    await sb.from('proposals').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'sent', sent_at: new Date().toISOString() } : p))
  }

  const handleMarkAccepted = async (id: string) => {
    const sb = getSupabase()
    await sb.from('proposals').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', id)
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'accepted', accepted_at: new Date().toISOString() } : p))
  }

  const handleConvertToInvoice = async (proposal: Proposal) => {
    setConverting(proposal.id)
    try {
      const params = new URLSearchParams()
      if (proposal.client_id) params.set('client_id', proposal.client_id)
      if (proposal.notes) params.set('notes', proposal.notes)
      router.push(`/dashboard/invoices/new?${params.toString()}`)
    } finally {
      setConverting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proposal?')) return
    const sb = getSupabase()
    await sb.from('proposals').delete().eq('id', id)
    setProposals(prev => prev.filter(p => p.id !== id))
  }

  return (
    <>
      <style>{`
        .pp-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .pp-main{flex:1;margin-left:220px;display:flex;flex-direction:column}
        .pp-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .pp-title{font-size:22px;font-weight:800;color:#FFF}
        .pp-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .pp-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:20px;max-width:1440px;width:100%;margin:0 auto}

        .pp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
        .pp-stat{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;transition:all .25s}
        .pp-stat:hover{transform:translateY(-2px);border-color:rgba(16,185,129,.3)}
        .pp-stat-label{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .pp-stat-val{font-size:22px;font-weight:800}

        .pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}
        .pp-card{background:rgba(18,30,22,.7);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .pp-card:hover{transform:translateY(-3px);border-color:rgba(16,185,129,.3);box-shadow:0 20px 40px -15px rgba(0,0,0,.7)}
        .pp-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
        .pp-card-title{font-size:15px;font-weight:700;color:#FFF}
        .pp-card-num{font-size:10px;color:rgba(255,255,255,.4);margin-top:2px}
        .pp-card-client{font-size:11px;color:rgba(255,255,255,.5);margin-top:4px}
        .pp-card-amount{font-size:20px;font-weight:800;color:#FFF;margin-top:10px}
        .pp-badge{padding:3px 10px;border-radius:100px;font-size:9px;font-weight:700;display:inline-block}
        .pp-card-meta{display:flex;gap:16px;margin-top:10px;font-size:10px;color:rgba(255,255,255,.4)}
        .pp-card-actions{display:flex;gap:6px;margin-top:14px;border-top:1px solid rgba(255,255,255,.06);padding-top:12px}
        .pp-action{flex:1;padding:7px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-size:10px;font-weight:600;font-family:'Outfit',sans-serif;text-align:center;transition:all .15s}
        .pp-action:hover{border-color:rgba(16,185,129,.4);color:#34D399}
        .pp-action.primary{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.3);color:#34D399}
        .pp-action.danger{color:rgba(248,113,113,.6);border-color:rgba(248,113,113,.15)}
        .pp-action.danger:hover{color:#F87171;background:rgba(248,113,113,.1)}
        .pp-empty{padding:60px;text-align:center;color:rgba(255,255,255,.4);font-size:14px}

        /* Modal */
        .pp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);z-index:100;display:flex;align-items:center;justify-content:center}
        .pp-modal{background:rgba(18,30,22,.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:28px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto}
        .pp-modal-title{font-size:18px;font-weight:800;color:#FFF;margin-bottom:4px}
        .pp-modal-sub{font-size:12px;color:rgba(255,255,255,.5);margin-bottom:20px}
        .pp-field-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;margin-top:14px}
        .pp-input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;font-size:13px;color:#FFF;font-family:'Outfit',sans-serif;outline:none;transition:border .2s}
        .pp-input:focus{border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,.2)}
        .pp-input::placeholder{color:rgba(255,255,255,.3)}
        .pp-textarea{min-height:80px;resize:vertical}
        .pp-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

        .pp-items-hdr{display:grid;grid-template-columns:2fr 60px 100px 30px;gap:8px;margin-bottom:4px}
        .pp-items-hdr span{font-size:9px;font-weight:700;color:rgba(255,255,255,.4);text-transform:uppercase}
        .pp-item-row{display:grid;grid-template-columns:2fr 60px 100px 30px;gap:8px;margin-bottom:6px}
        .pp-item-input{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:6px 8px;font-size:12px;color:#FFF;font-family:'Outfit',sans-serif;outline:none;width:100%}
        .pp-item-del{background:none;border:none;color:rgba(248,113,113,.5);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
        .pp-add-item{font-size:11px;color:#34D399;background:none;border:none;cursor:pointer;font-weight:600;font-family:'Outfit',sans-serif;padding:4px 0}

        .pp-total{text-align:right;font-size:16px;font-weight:800;color:#34D399;margin-top:8px}
        .pp-modal-actions{display:flex;gap:10px;margin-top:20px}
        .pp-modal-cancel{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:transparent;color:rgba(255,255,255,.6);cursor:pointer;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif}
        .pp-modal-save{flex:2;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#10B981,#059669);color:#FFF;cursor:pointer;font-size:13px;font-weight:700;font-family:'Outfit',sans-serif;box-shadow:0 4px 16px rgba(16,185,129,.35);transition:all .2s}
        .pp-modal-save:disabled{opacity:.6;cursor:not-allowed}

        @media(max-width:1024px){
          .pp-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .pp-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .pp-content{padding:16px}
          .pp-stats{grid-template-columns:1fr 1fr}
          .pp-grid{grid-template-columns:1fr}
          .pp-row2{grid-template-columns:1fr}
          .pp-items-hdr, .pp-item-row{grid-template-columns:1fr 50px 80px 24px; gap:4px}
          .pp-modal{padding:18px; width:100%; max-width:calc(100vw - 20px)}
        }
        @media(max-width:600px){
          .pp-stats{grid-template-columns:1fr}
          .pp-top button{width:100%; justify-content:center}
          .pp-card-actions{flex-wrap:wrap}
        }
      `}</style>

      <div className="pp-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="pp-main">
          <div className="pp-top">
            <div>
              <div className="pp-title">Proposals & Estimates</div>
              <div className="pp-sub">Send quotes to clients → convert accepted proposals to invoices in 1 click</div>
            </div>
            <button style={{ background: 'linear-gradient(135deg,#10B981,#059669)', border: 'none', borderRadius: 10, padding: '10px 20px', color: '#FFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", boxShadow: '0 4px 16px rgba(16,185,129,.35)' }} onClick={() => setShowModal(true)}>
              + New Proposal
            </button>
          </div>

          <div className="pp-content">
            {/* Stats */}
            <div className="pp-stats">
              <div className="pp-stat">
                <div className="pp-stat-label">Total Proposals</div>
                <div className="pp-stat-val" style={{ color: '#FFF' }}>{stats.total}</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-label">Sent & Pending</div>
                <div className="pp-stat-val" style={{ color: '#60A5FA' }}>{stats.sent}</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-label">Accepted</div>
                <div className="pp-stat-val" style={{ color: '#34D399' }}>{stats.accepted}</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-label">Total Value</div>
                <div className="pp-stat-val" style={{ color: '#FFF', fontSize: 18 }}>{fmtINR(stats.totalVal)}</div>
              </div>
            </div>

            {/* Proposal Cards Grid */}
            {proposals.length === 0 ? (
              <div className="pp-empty">No proposals yet. Create your first proposal to start sending quotes to clients!</div>
            ) : (
              <div className="pp-grid">
                {proposals.map(p => {
                  const cfg = STATUS_CFG[p.status] || STATUS_CFG.draft
                  return (
                    <div key={p.id} className="pp-card">
                      <div className="pp-card-top">
                        <div>
                          <div className="pp-card-title">{p.title}</div>
                          <div className="pp-card-num">{p.proposal_number}</div>
                          <div className="pp-card-client">{p.clients?.[0]?.name || '—'}</div>
                        </div>
                        <span className="pp-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="pp-card-amount">{fmtINR(p.total_amount)}</div>
                      <div className="pp-card-meta">
                        <span>Created: {fmtDate(p.created_at)}</span>
                        {p.valid_until && <span>Valid till: {fmtDate(p.valid_until)}</span>}
                      </div>
                      <div className="pp-card-actions">
                        {p.status === 'draft' && (
                          <button className="pp-action" onClick={() => handleMarkSent(p.id)}>📤 Mark Sent</button>
                        )}
                        {p.status === 'sent' && (
                          <button className="pp-action primary" onClick={() => handleMarkAccepted(p.id)}>✅ Mark Accepted</button>
                        )}
                        {(p.status === 'accepted' || p.status === 'sent') && (
                          <button className="pp-action primary" onClick={() => handleConvertToInvoice(p)} disabled={!!converting}>
                            {converting === p.id ? 'Converting...' : '🧾 Convert to Invoice'}
                          </button>
                        )}
                        <button className="pp-action danger" onClick={() => handleDelete(p.id)}>🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Proposal Modal */}
      {showModal && (
        <div className="pp-overlay" onClick={() => setShowModal(false)}>
          <div className="pp-modal" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-title">New Proposal</div>
            <div className="pp-modal-sub">Proposal #{previewNumber}</div>

            <div className="pp-field-label">Title</div>
            <input className="pp-input" placeholder="e.g. Website Redesign Proposal" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

            <div className="pp-row2">
              <div>
                <div className="pp-field-label">Client</div>
                <select className="pp-input" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                </select>
              </div>
              <div>
                <div className="pp-field-label">Valid Until</div>
                <input className="pp-input" type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>

            <div className="pp-field-label">Scope of Work</div>
            <textarea className="pp-input pp-textarea" placeholder="Describe the scope of work..." value={form.scope_of_work} onChange={e => setForm(f => ({ ...f, scope_of_work: e.target.value }))} />

            <div className="pp-field-label">Line Items</div>
            <div className="pp-items-hdr">
              <span>Description</span><span>Qty</span><span>Rate (₹)</span><span></span>
            </div>
            {items.map((item, idx) => (
              <div key={item.id} className="pp-item-row">
                <input className="pp-item-input" placeholder="Service description" value={item.description} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], description: e.target.value }; setItems(n) }} />
                <input className="pp-item-input" type="number" value={item.qty || ''} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], qty: Number(e.target.value) }; setItems(n) }} />
                <input className="pp-item-input" type="number" value={item.rate || ''} onChange={e => { const n = [...items]; n[idx] = { ...n[idx], rate: Number(e.target.value) }; setItems(n) }} />
                <button className="pp-item-del" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))}>×</button>
              </div>
            ))}
            <button className="pp-add-item" onClick={() => setItems([...items, { id: uid(), description: '', qty: 1, rate: 0 }])}>+ Add item</button>
            <div className="pp-total">Total: {fmtINR(totalAmount)}</div>

            <div className="pp-field-label">Terms & Conditions</div>
            <textarea className="pp-input pp-textarea" placeholder="Payment terms, delivery timeline..." value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} />

            <div className="pp-modal-actions">
              <button className="pp-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pp-modal-save" onClick={handleSave} disabled={saving || !form.title}>
                {saving ? 'Saving...' : '✓ Create Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
