'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface Client {
  id: string
  name: string
  company_name: string | null
}

interface Contract {
  id: string
  title: string
  client_id: string | null
  extracted_amount: number | null
  extracted_due_date: string | null
  extracted_payment_terms: string | null
  extracted_late_fee: string | null
  extracted_scope: string | null
  ai_analysis: AiAnalysis | null
  created_at: string
  clients: { name: string } | null
}

interface Risk {
  clause: string
  risk_level: 'high' | 'medium' | 'low'
  description: string
  recommendation: string
}

interface MissingClause {
  clause: string
  importance: 'high' | 'medium' | 'low'
  description: string
}

interface Redline {
  issue: string
  current_risk: string
  proposed_clause: string
  win_win_justification: string
}

interface MsmeRight {
  right_name: string
  legal_reference: string
  explanation: string
}

interface AiAnalysis {
  summary?: string
  risks?: Risk[]
  missing_clauses?: MissingClause[]
  contractor_redlines?: Redline[]
  msme_legal_rights?: MsmeRight[]
}

interface Props {
  contracts: Contract[]
  clients: Client[]
  userName: string
  userEmail: string
  userId: string
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

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const RISK_CFG = {
  high:   { emoji: '🔴', bg: 'rgba(192,57,43,.07)', border: 'rgba(192,57,43,.18)', color: '#791F1F', label: 'High Risk' },
  medium: { emoji: '🟡', bg: 'rgba(186,117,23,.07)', border: 'rgba(186,117,23,.18)', color: '#633806', label: 'Medium Risk' },
  low:    { emoji: '🟢', bg: 'rgba(27,94,59,.06)',    border: 'rgba(27,94,59,.15)',   color: '#085041', label: 'Low Risk' },
}

// ── Component ──────────────────────────────────────────────────
export default function ContractsPageClient({
  contracts: initialContracts,
  clients,
  userName,
  userEmail,
  userId,
}: Props) {
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>(initialContracts)

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // AI steps: 0=upload, 1=reading file, 2=calling AI, 3=form filled, 4=show analysis
  const [aiStep, setAiStep] = useState(0)
  const [loadingText, setLoadingText] = useState('')
  const [aiError, setAiError] = useState('')
  const [activeTab, setActiveTab] = useState<'terms' | 'analysis' | 'redlines'>('terms')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [lateFee, setLateFee] = useState('')
  const [scope, setScope] = useState('')
  const [saving, setSaving] = useState(false)

  // AI analysis results
  const [aiSummary, setAiSummary] = useState('')
  const [aiRisks, setAiRisks] = useState<Risk[]>([])
  const [aiMissing, setAiMissing] = useState<MissingClause[]>([])
  const [aiRedlines, setAiRedlines] = useState<Redline[]>([])
  const [aiMsmeRights, setAiMsmeRights] = useState<MsmeRight[]>([])

  // View analysis modal
  const [viewContract, setViewContract] = useState<Contract | null>(null)

  // Metrics
  const totalContracts = contracts.length
  const linkedCount = contracts.filter(c => c.client_id).length
  const activeValue = contracts.reduce((acc, c) => acc + Number(c.extracted_amount || 0), 0)

  // ── Convert File to Base64 ──
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        const base64Data = result.split(',')[1] || ''
        resolve(base64Data)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  // ── Run real AI extraction ──
  const runAiExtraction = async (file: File) => {
    setFileName(file.name)
    setAiError('')
    setAiStep(1)
    setLoadingText('Preparing document for AI analysis...')

    try {
      // Step 1: Encode file to base64
      const fileData = await fileToBase64(file)
      const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain')

      if (!fileData) {
        setAiError('Could not read the document file. Please try another file.')
        setAiStep(0)
        return
      }

      // Step 2: Call AI API with full document payload
      setAiStep(2)
      setLoadingText('Analyzing document with AI...')

      const res = await fetch('/api/contracts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData, mimeType }),
      })

      const data = await res.json()

      if (!res.ok) {
        setAiError(data.error || 'AI analysis failed. Please try again.')
        setAiStep(0)
        return
      }

      const a = data.analysis

      // Step 3: Pre-fill form with real AI data
      setTitle(a.title || file.name.replace(/\.[^.]+$/, ''))
      setAmount(a.amount ? String(a.amount) : '')
      setPaymentTerms(a.payment_terms || 'Net 30')
      setLateFee(a.late_fee || '')
      setScope(a.scope || '')
      setDueDate(a.due_date || '')
      setAiSummary(a.summary || '')
      setAiRisks(a.risks || [])
      setAiMissing(a.missing_clauses || [])
      setAiRedlines(a.contractor_redlines || [])
      setAiMsmeRights(a.msme_legal_rights || [])
      setActiveTab('terms')
      setAiStep(3)

    } catch (e) {
      console.error(e)
      setAiError('Failed to analyze the document. Check your internet connection and try again.')
      setAiStep(0)
    }
  }

  // ── Drag & Drop ──
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(e.type === 'dragenter' || e.type === 'dragover')
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false)
    if (e.dataTransfer.files?.[0]) runAiExtraction(e.dataTransfer.files[0])
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) runAiExtraction(e.target.files[0])
  }

  const resetForm = () => {
    setShowAddModal(false); setFileName(''); setAiStep(0); setAiError('')
    setTitle(''); setClientId(''); setAmount(''); setDueDate('')
    setPaymentTerms('Net 30'); setLateFee(''); setScope(''); setSaving(false)
    setAiSummary(''); setAiRisks([]); setAiMissing([])
    setAiRedlines([]); setAiMsmeRights([]); setActiveTab('terms'); setCopiedIdx(null)
  }

  // ── Save ──
  const handleSave = async () => {
    if (!title.trim()) { alert('Contract title is required'); return }
    setSaving(true)
    try {
      const sb = getSupabase()
      const aiAnalysis = (aiSummary || aiRisks.length > 0 || aiMissing.length > 0 || aiRedlines.length > 0)
        ? {
            summary: aiSummary,
            risks: aiRisks,
            missing_clauses: aiMissing,
            contractor_redlines: aiRedlines,
            msme_legal_rights: aiMsmeRights,
          }
        : null

      const payload: Record<string, unknown> = {
        user_id: userId,
        title: title.trim(),
        client_id: clientId || null,
        extracted_amount: amount ? Number(amount) : null,
        extracted_due_date: dueDate || null,
        extracted_payment_terms: paymentTerms || null,
        extracted_late_fee: lateFee.trim() || null,
        extracted_scope: scope.trim() || null,
      }
      if (aiAnalysis) payload.ai_analysis = aiAnalysis

      let result: any = await sb
        .from('contracts')
        .insert(payload)
        .select(`
          id, title, client_id,
          extracted_amount, extracted_due_date,
          extracted_payment_terms, extracted_late_fee, extracted_scope,
          ai_analysis, created_at,
          clients ( name )
        `)
        .single()

      let data = result.data
      let error = result.error

      // Fallback: If Supabase throws an error due to missing 'ai_analysis' column in DB, save without it
      if (error && (error.message?.includes('ai_analysis') || error.code === 'PGRST204' || error.message?.includes('column'))) {
        delete payload.ai_analysis
        const fallback = await sb
          .from('contracts')
          .insert(payload)
          .select(`
            id, title, client_id,
            extracted_amount, extracted_due_date,
            extracted_payment_terms, extracted_late_fee, extracted_scope,
            created_at,
            clients ( name )
          `)
          .single()
        data = fallback.data
        error = fallback.error
      }

      if (error) throw error
      if (data) setContracts(prev => [data as unknown as Contract, ...prev])
      resetForm()
    } catch (e: any) {
      console.error(e)
      alert(`Error saving contract: ${e?.message || 'Please check connection.'}`)
    } finally { setSaving(false) }
  }

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contract?')) return
    try {
      const sb = getSupabase()
      const { error } = await sb.from('contracts').delete().eq('id', id)
      if (error) throw error
      setContracts(prev => prev.filter(c => c.id !== id))
    } catch (e) { console.error(e); alert('Error deleting contract.') }
  }

  // ── Risk counts for a contract ──
  const riskCounts = (c: Contract) => {
    const risks = c.ai_analysis?.risks || []
    return {
      high: risks.filter(r => r.risk_level === 'high').length,
      medium: risks.filter(r => r.risk_level === 'medium').length,
      low: risks.filter(r => r.risk_level === 'low').length,
    }
  }

  // ── Render Analysis Panel (used in both add modal and view modal) ──
  const renderAnalysis = (summary: string, risks: Risk[], missing: MissingClause[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary */}
      {summary && (
        <div style={{ background: 'rgba(27,94,59,.05)', border: '.5px solid rgba(27,94,59,.15)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(26,20,13,.35)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 6 }}>AI Summary</div>
          <div style={{ fontSize: 12, color: '#1A140D', lineHeight: 1.55 }}>{summary}</div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(26,20,13,.40)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 8 }}>⚠️ Legal Risks & Loopholes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.map((r, i) => {
              const cfg = RISK_CFG[r.risk_level] || RISK_CFG.medium
              return (
                <div key={i} style={{ background: cfg.bg, border: `.5px solid ${cfg.border}`, borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 11 }}>{cfg.emoji}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(26,20,13,.45)', marginLeft: 'auto' }}>
                      {r.clause}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#1A140D', lineHeight: 1.5, marginBottom: 6 }}>
                    {r.description}
                  </div>
                  <div style={{ fontSize: 10, color: '#1B5E3B', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <span>💡</span> {r.recommendation}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Missing Clauses */}
      {missing.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(26,20,13,.40)', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 8 }}>📋 Missing Clauses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {missing.map((m, i) => {
              const cfg = RISK_CFG[m.importance] || RISK_CFG.medium
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'rgba(26,20,13,.03)', borderRadius: 8, border: '.5px solid rgba(26,20,13,.06)' }}>
                  <span style={{ fontSize: 11 }}>{cfg.emoji}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#1A140D', marginBottom: 2 }}>{m.clause}</div>
                    <div style={{ fontSize: 10, color: 'rgba(26,20,13,.55)', lineHeight: 1.45 }}>{m.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {risks.length === 0 && missing.length === 0 && !summary && (
        <div style={{ textAlign: 'center', padding: '20px 10px', color: 'rgba(26,20,13,.40)', fontSize: 12 }}>
          No AI analysis available for this contract.
        </div>
      )}
    </div>
  )

  // ── Render Redlines & Counter Proposals Panel ──
  const renderRedlines = (redlines: Redline[], msmeRights: MsmeRight[]) => {
    const handleCopy = (text: string, idx: number) => {
      navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Contractor Redlines */}
        {redlines.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1B5E3B', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>🛡️</span> Proposed Counter-Clauses & Amendments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {redlines.map((item, idx) => (
                <div key={idx} style={{ background: '#FDFAF5', border: '.5px solid rgba(27,94,59,.20)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1A140D' }}>{item.issue}</div>
                    <button
                      onClick={() => handleCopy(item.proposed_clause, idx)}
                      style={{
                        background: copiedIdx === idx ? '#1B5E3B' : 'white',
                        color: copiedIdx === idx ? 'white' : '#1B5E3B',
                        border: '.5px solid rgba(27,94,59,.30)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        transition: 'all .15s'
                      }}
                    >
                      {copiedIdx === idx ? '✓ Wording Copied' : '📋 Copy Clause Wording'}
                    </button>
                  </div>

                  <div style={{ fontSize: 11, color: '#791F1F', background: 'rgba(192,57,43,.05)', padding: '6px 10px', borderRadius: 6, marginBottom: 8, lineHeight: 1.45 }}>
                    <strong>Risk:</strong> {item.current_risk}
                  </div>

                  <div style={{ background: 'white', border: '1px dashed rgba(27,94,59,.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1B5E3B', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 4 }}>Suggested Counter-Wording to Send Client:</div>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#1A140D', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {item.proposed_clause}
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: 'rgba(26,20,13,.60)', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <span style={{ fontSize: 11 }}>🤝</span> <strong>Win-Win Justification:</strong> {item.win_win_justification}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MSME Legal Protections (India) */}
        {msmeRights.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#185FA5', textTransform: 'uppercase' as const, letterSpacing: '.07em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>⚖️</span> Statutory Indian MSME Protections
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msmeRights.map((r, idx) => (
                <div key={idx} style={{ background: 'rgba(24,95,165,.05)', border: '.5px solid rgba(24,95,165,.18)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0C447C' }}>{r.right_name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(24,95,165,.12)', color: '#185FA5', padding: '2px 6px', borderRadius: 4 }}>
                      {r.legal_reference}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#1A140D', lineHeight: 1.45 }}>
                    {r.explanation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {redlines.length === 0 && msmeRights.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: 'rgba(26,20,13,.40)', fontSize: 12 }}>
            No specific contractor counter-proposals generated for this document.
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .co-root{display:flex;min-height:100vh}
        .co-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        .co-top{background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .co-top-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .co-top-sub{font-size:11px;color:rgba(26,20,13,.38);margin-top:2px}
        .co-btn-primary{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(27,94,59,.28);transition:all .18s}
        .co-btn-primary:hover{transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.36)}

        .co-content{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:16px}

        .co-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .co-stat{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;padding:14px 16px}
        .co-stat-label{font-size:10px;font-weight:500;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .co-stat-val{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1A140D;letter-spacing:-.02em;line-height:1}

        .co-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
        .co-card{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;display:flex;flex-direction:column;min-height:220px;transition:box-shadow .18s,transform .18s}
        .co-card:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,20,13,.05)}
        .co-card-body{padding:16px;flex:1;display:flex;flex-direction:column;gap:8px}
        .co-card-title{font-family:'Lora',serif;font-size:15px;font-weight:700;color:#1A140D;letter-spacing:-.01em;line-height:1.25}
        .co-card-client{font-size:11px;font-weight:500;color:#1B5E3B;background:rgba(27,94,59,.07);padding:2px 8px;border-radius:100px;width:fit-content}
        .co-card-no-client{font-size:11px;font-weight:500;color:#E8692A;background:rgba(232,105,42,.07);padding:2px 8px;border-radius:100px;width:fit-content}
        .co-detail-row{display:flex;align-items:flex-start;gap:6px;font-size:11px;color:rgba(26,20,13,.65);line-height:1.4}
        .co-detail-icon{font-size:12px;flex-shrink:0;width:16px;text-align:center}

        /* Risk pills on cards */
        .co-risk-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
        .co-risk-pill{font-size:9px;font-weight:700;padding:2px 7px;border-radius:100px;display:flex;align-items:center;gap:3px}

        .co-card-actions{border-top:.5px solid rgba(26,20,13,.06);padding:10px 16px;display:flex;align-items:center;gap:8px;background:#FCFAF6;border-bottom-left-radius:12px;border-bottom-right-radius:12px}
        .co-card-btn{background:none;border:none;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#1B5E3B;cursor:pointer}
        .co-card-btn:hover{text-decoration:underline}
        .co-card-del{background:none;border:none;cursor:pointer;opacity:.35;transition:opacity .15s;margin-left:auto}
        .co-card-del:hover{opacity:1}

        .co-empty{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:16px;padding:48px 40px;text-align:center;max-width:480px;margin:40px auto;width:100%}
        .co-empty-icon{width:56px;height:56px;border-radius:14px;background:rgba(27,94,59,.09);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
        .co-empty-title{font-family:'Lora',serif;font-size:20px;font-weight:700;color:#1A140D;letter-spacing:-.02em;margin-bottom:10px}
        .co-empty-desc{font-size:12px;color:rgba(26,20,13,.50);line-height:1.6;margin-bottom:24px}

        .co-modal-overlay{position:fixed;inset:0;background:rgba(26,20,13,.45);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(2px)}
        .co-modal{background:white;border-radius:16px;width:580px;max-width:calc(100vw - 32px);max-height:calc(100vh - 40px);overflow-y:auto;box-shadow:0 24px 64px rgba(26,20,13,.22);display:flex;flex-direction:column}
        .co-modal-hdr{padding:16px 24px;border-bottom:.5px solid rgba(26,20,13,.08);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .co-modal-title{font-family:'Lora',serif;font-size:17px;font-weight:700;color:#1A140D}
        .co-modal-close{background:none;border:none;cursor:pointer;font-size:18px;color:rgba(26,20,13,.35)}
        .co-modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px;flex:1;overflow-y:auto}

        .co-dropzone{border:1.5px dashed rgba(26,20,13,.15);border-radius:12px;background:#FDFAF5;padding:24px 20px;text-align:center;cursor:pointer;transition:all .18s}
        .co-dropzone.dragging{border-color:#1B5E3B;background:rgba(27,94,59,.04)}
        .co-dropzone-icon{font-size:24px;margin-bottom:8px}
        .co-dropzone-title{font-size:12px;font-weight:600;color:#1A140D;margin-bottom:2px}
        .co-dropzone-sub{font-size:10px;color:rgba(26,20,13,.40)}

        .co-ai-status{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px}
        .co-spinner{width:28px;height:28px;border:3px solid rgba(27,94,59,.15);border-top:3px solid #1B5E3B;border-radius:50%;animation:spin 1s linear infinite}
        @keyframes spin{0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)}}
        .co-ai-text{font-size:12px;font-weight:600;color:#1B5E3B;animation:pulseText 1.5s infinite}
        @keyframes pulseText{0%,100%{opacity:1} 50%{opacity:.6}}
        .co-ai-error{background:rgba(192,57,43,.06);border:.5px solid rgba(192,57,43,.18);border-radius:9px;padding:10px 14px;font-size:11px;color:#791F1F;line-height:1.5}

        .co-badge-ai{display:inline-flex;align-items:center;gap:4px;background:rgba(27,94,59,.08);border:.5px solid rgba(27,94,59,.22);border-radius:4px;padding:2px 8px;font-size:9px;font-weight:700;color:#1B5E3B}

        /* Tabs */
        .co-tabs{display:flex;gap:0;border-bottom:1px solid rgba(26,20,13,.08);margin-bottom:4px}
        .co-tab{padding:8px 16px;font-size:11px;font-weight:600;color:rgba(26,20,13,.40);cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;transition:all .15s}
        .co-tab:hover{color:#1A140D}
        .co-tab.active{color:#1B5E3B;border-bottom-color:#1B5E3B}

        .co-label{font-size:10px;font-weight:600;color:rgba(26,20,13,.45);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
        .co-input{width:100%;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;background:white}
        .co-input:focus{border-color:#2D8A58}
        .co-select{width:100%;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;background:white;cursor:pointer}
        .co-textarea{width:100%;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:8px 10px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;resize:vertical;min-height:50px}
        .co-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .co-modal-actions{display:flex;gap:8px;padding:14px 24px;border-top:.5px solid rgba(26,20,13,.08);background:#FCFAF6;justify-content:flex-end;flex-shrink:0}
        .co-btn-cancel{background:white;border:.5px solid rgba(26,20,13,.12);border-radius:8px;padding:9px 16px;font-size:12px;font-weight:500;color:rgba(26,20,13,.55);cursor:pointer;font-family:'DM Sans',sans-serif}
        .co-btn-save{background:#1B5E3B;border:none;border-radius:8px;padding:9px 20px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif}
        .co-btn-save:disabled{opacity:.6;cursor:not-allowed}

        @media(max-width:900px){
          .co-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .co-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .co-content{padding:16px}
          .co-stats{grid-template-columns:1fr 1fr}
          .co-modal{width:100%; max-width:calc(100vw - 24px); max-height:calc(100vh - 40px)}
        }
        @media(max-width:600px){
          .co-stats{grid-template-columns:1fr}
          .co-grid{grid-template-columns:1fr}
          .co-form-row{grid-template-columns:1fr}
          .co-tabs{overflow-x:auto}
          .co-tab{white-space:nowrap}
        }
      `}</style>

      <div className="co-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="co-main">
          <div className="co-top">
            <div>
              <div className="co-top-title">Contracts</div>
              <div className="co-top-sub">AI-powered contract analysis</div>
            </div>
            <button className="co-btn-primary" onClick={() => setShowAddModal(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add Contract
            </button>
          </div>

          <div className="co-content">
            <div className="co-stats">
              <div className="co-stat">
                <div className="co-stat-label">Total Contracts</div>
                <div className="co-stat-val">{totalContracts}</div>
              </div>
              <div className="co-stat">
                <div className="co-stat-label">Linked to Clients</div>
                <div className="co-stat-val">{linkedCount} / {totalContracts}</div>
              </div>
              <div className="co-stat">
                <div className="co-stat-label">Active Value</div>
                <div className="co-stat-val">{fmtINR(activeValue)}</div>
              </div>
            </div>

            {contracts.length === 0 ? (
              <div className="co-empty">
                <div className="co-empty-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B5E3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <h2 className="co-empty-title">No contracts added</h2>
                <p className="co-empty-desc">Upload a contract PDF and AI will extract terms, identify legal risks, and flag missing clauses.</p>
                <button className="co-btn-primary" style={{ margin: '0 auto' }} onClick={() => setShowAddModal(true)}>Add First Contract</button>
              </div>
            ) : (
              <div className="co-grid">
                {contracts.map(c => {
                  const rc = riskCounts(c)
                  const hasAnalysis = c.ai_analysis && ((c.ai_analysis.risks?.length || 0) > 0 || (c.ai_analysis.missing_clauses?.length || 0) > 0 || c.ai_analysis.summary)
                  return (
                    <div className="co-card" key={c.id}>
                      <div className="co-card-body" onClick={() => router.push(`/dashboard/contracts/${c.id}`)} style={{ cursor: 'pointer' }}>
                        <div className="co-card-title">{c.title}</div>
                        {c.clients ? <div className="co-card-client">{c.clients.name}</div> : <div className="co-card-no-client">No client linked</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                          <div className="co-detail-row"><span className="co-detail-icon">💰</span><div><strong>Value:</strong> {c.extracted_amount ? fmtINR(c.extracted_amount) : '—'}</div></div>
                          <div className="co-detail-row"><span className="co-detail-icon">⏰</span><div><strong>Terms:</strong> {c.extracted_payment_terms || '—'}</div></div>
                          <div className="co-detail-row"><span className="co-detail-icon">⚖️</span><div><strong>Late Fee:</strong> {c.extracted_late_fee || '—'}</div></div>
                        </div>

                        {/* Risk pills */}
                        {(rc.high > 0 || rc.medium > 0) && (
                          <div className="co-risk-row">
                            {rc.high > 0 && <span className="co-risk-pill" style={{ background: 'rgba(192,57,43,.08)', color: '#791F1F' }}>🔴 {rc.high} high</span>}
                            {rc.medium > 0 && <span className="co-risk-pill" style={{ background: 'rgba(186,117,23,.08)', color: '#633806' }}>🟡 {rc.medium} medium</span>}
                            {rc.low > 0 && <span className="co-risk-pill" style={{ background: 'rgba(27,94,59,.06)', color: '#085041' }}>🟢 {rc.low} low</span>}
                          </div>
                        )}
                      </div>

                      <div className="co-card-actions">
                        <button className="co-card-btn" onClick={() => router.push(`/dashboard/contracts/${c.id}`)}>
                          View Full Workspace →
                        </button>
                        <button className="co-card-btn" onClick={() => router.push(`/dashboard/invoices/new?client=${c.client_id || ''}&contract=${c.id}`)}>Create Invoice</button>
                        <button className="co-card-del" onClick={() => handleDelete(c.id)} title="Delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Contract Modal ── */}
      {showAddModal && (
        <div className="co-modal-overlay" onClick={resetForm}>
          <div className="co-modal" onClick={e => e.stopPropagation()}>
            <div className="co-modal-hdr">
              <div className="co-modal-title">Add Contract</div>
              <button className="co-modal-close" onClick={resetForm}>×</button>
            </div>

            <div className="co-modal-body">
              {/* Step 0: Dropzone */}
              {aiStep === 0 && (
                <>
                  <div
                    className={`co-dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragEnter={handleDrag} onDragOver={handleDrag}
                    onDragLeave={handleDrag} onDrop={handleDrop}
                    onClick={() => document.getElementById('contract-file-input')?.click()}
                  >
                    <input type="file" id="contract-file-input" style={{ display: 'none' }} accept=".pdf,.docx,.doc,.txt" onChange={handleFileSelect} />
                    <div className="co-dropzone-icon">📄</div>
                    <div className="co-dropzone-title">Upload Contract Document</div>
                    <div className="co-dropzone-sub">Drag & drop or click · PDF, DOCX, TXT</div>
                    <div style={{ fontSize: 9, color: 'rgba(26,20,13,.30)', marginTop: 8 }}>AI will extract terms and analyze legal risks</div>
                  </div>
                  {aiError && <div className="co-ai-error">{aiError}</div>}
                </>
              )}

              {/* Step 1-2: Loading */}
              {(aiStep === 1 || aiStep === 2) && (
                <div className="co-ai-status">
                  <div className="co-spinner" />
                  <div className="co-ai-text">{loadingText}</div>
                </div>
              )}

              {/* Step 3: Form + Analysis */}
              {aiStep === 3 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)' }}>File: <strong>{fileName}</strong></div>
                    <div className="co-badge-ai">✨ AI Analysis</div>
                  </div>

                  <div className="co-tabs">
                    <button className={`co-tab ${activeTab === 'terms' ? 'active' : ''}`} onClick={() => setActiveTab('terms')}>
                      📋 Extracted Terms
                    </button>
                    <button className={`co-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
                      ⚠️ Legal Risks {aiRisks.length > 0 && <span style={{ background: 'rgba(192,57,43,.12)', color: '#791F1F', padding: '1px 5px', borderRadius: 100, fontSize: 9, marginLeft: 4 }}>{aiRisks.length}</span>}
                    </button>
                    <button className={`co-tab ${activeTab === 'redlines' ? 'active' : ''}`} onClick={() => setActiveTab('redlines')}>
                      🛡️ Contractor Counter-Proposals {aiRedlines.length > 0 && <span style={{ background: 'rgba(27,94,59,.12)', color: '#1B5E3B', padding: '1px 5px', borderRadius: 100, fontSize: 9, marginLeft: 4 }}>{aiRedlines.length}</span>}
                    </button>
                  </div>

                  {activeTab === 'terms' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <div className="co-label">Contract Title *</div>
                        <input className="co-input" value={title} onChange={e => setTitle(e.target.value)} />
                      </div>
                      <div className="co-form-row">
                        <div>
                          <div className="co-label">Link to Client</div>
                          <select className="co-select" value={clientId} onChange={e => setClientId(e.target.value)}>
                            <option value="">-- Select Client --</option>
                            {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="co-label">Contract Value (₹)</div>
                          <input className="co-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                        </div>
                      </div>
                      <div className="co-form-row">
                        <div>
                          <div className="co-label">Payment Terms</div>
                          <input className="co-input" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                        </div>
                        <div>
                          <div className="co-label">End Date</div>
                          <input className="co-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <div className="co-label">Late Fee Clause</div>
                        <input className="co-input" value={lateFee} onChange={e => setLateFee(e.target.value)} />
                      </div>
                      <div>
                        <div className="co-label">Scope of Work</div>
                        <textarea className="co-textarea" value={scope} onChange={e => setScope(e.target.value)} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && renderAnalysis(aiSummary, aiRisks, aiMissing)}
                  {activeTab === 'redlines' && renderRedlines(aiRedlines, aiMsmeRights)}
                </>
              )}
            </div>

            <div className="co-modal-actions">
              <button className="co-btn-cancel" onClick={resetForm}>Cancel</button>
              {aiStep === 3 && (
                <button className="co-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Contract'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Analysis Modal ── */}
      {viewContract && (
        <div className="co-modal-overlay" onClick={() => setViewContract(null)}>
          <div className="co-modal" onClick={e => e.stopPropagation()}>
            <div className="co-modal-hdr">
              <div>
                <div className="co-modal-title">{viewContract.title}</div>
                <div style={{ fontSize: 10, color: 'rgba(26,20,13,.40)', marginTop: 3 }}>
                  {viewContract.clients?.name || 'No client linked'} · Added {fmtDate(viewContract.created_at)}
                </div>
              </div>
              <button className="co-modal-close" onClick={() => setViewContract(null)}>×</button>
            </div>

            <div className="co-modal-body">
              {/* Quick terms summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Value', val: viewContract.extracted_amount ? fmtINR(viewContract.extracted_amount) : '—' },
                  { label: 'Terms', val: viewContract.extracted_payment_terms || '—' },
                  { label: 'Late Fee', val: viewContract.extracted_late_fee || '—' },
                  { label: 'Scope', val: viewContract.extracted_scope || '—' },
                ].map(t => (
                  <div key={t.label} style={{ background: 'rgba(26,20,13,.03)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(26,20,13,.35)', textTransform: 'uppercase' as const, marginBottom: 3 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#1A140D', lineHeight: 1.4 }}>{t.val}</div>
                  </div>
                ))}
              </div>

              {/* Modal tabs for viewing saved analysis */}
              <div className="co-tabs" style={{ marginTop: 10 }}>
                <button className={`co-tab ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
                  ⚠️ Legal Risks & Missing Clauses
                </button>
                <button className={`co-tab ${activeTab === 'redlines' ? 'active' : ''}`} onClick={() => setActiveTab('redlines')}>
                  🛡️ Contractor Counter-Proposals & MSME Rights
                </button>
              </div>

              {activeTab === 'analysis' && viewContract.ai_analysis && renderAnalysis(
                viewContract.ai_analysis.summary || '',
                viewContract.ai_analysis.risks || [],
                viewContract.ai_analysis.missing_clauses || [],
              )}

              {activeTab === 'redlines' && viewContract.ai_analysis && renderRedlines(
                viewContract.ai_analysis.contractor_redlines || [],
                viewContract.ai_analysis.msme_legal_rights || [],
              )}
            </div>

            <div className="co-modal-actions">
              <button className="co-btn-cancel" onClick={() => setViewContract(null)}>Close</button>
              <button className="co-btn-save" onClick={() => { setViewContract(null); router.push(`/dashboard/invoices/new?client=${viewContract.client_id || ''}&contract=${viewContract.id}`) }}>
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
