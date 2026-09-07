'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  whatsapp: string | null
  phone: string | null
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
  clients: Client | null
}

interface Props {
  contract: Contract
  clients: { id: string; name: string; company_name: string | null }[]
  userName: string
  userEmail: string
  businessName: string
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

const RISK_CFG = {
  high:   { emoji: '🔴', bg: 'rgba(192,57,43,.06)', border: 'rgba(192,57,43,.18)', color: '#791F1F', label: 'High Risk' },
  medium: { emoji: '🟡', bg: 'rgba(186,117,23,.06)', border: 'rgba(186,117,23,.18)', color: '#633806', label: 'Medium Risk' },
  low:    { emoji: '🟢', bg: 'rgba(27,94,59,.05)',    border: 'rgba(27,94,59,.15)',   color: '#085041', label: 'Low Risk' },
}

export default function ContractDetailPageClient({
  contract,
  userName,
  userEmail,
  businessName,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'risks' | 'redlines' | 'negotiation'>('redlines')
  const [copiedClauseIdx, setCopiedClauseIdx] = useState<number | null>(null)
  const [copiedMsg, setCopiedMsg] = useState(false)

  const analysis = contract.ai_analysis || {}
  const summary = analysis.summary || ''
  const risks = analysis.risks || []
  const missing = analysis.missing_clauses || []
  const redlines = analysis.contractor_redlines || []
  const msmeRights = analysis.msme_legal_rights || []

  // Count high/med risks
  const highRisks = risks.filter(r => r.risk_level === 'high').length
  const medRisks = risks.filter(r => r.risk_level === 'medium').length

  // Build complete negotiation email/message draft
  const buildNegotiationMessage = (channel: 'email' | 'whatsapp') => {
    const clientName = contract.clients?.name || 'Client'
    const title = contract.title || 'Contract'

    let msg = `Dear ${clientName} team,\n\n`
    msg += `Thank you for sharing the ${title}. We have reviewed the agreement and are excited to work together! `
    msg += `To ensure a fair, transparent relationship for both parties, we would like to propose a few small amendments before signing:\n\n`

    if (redlines.length > 0) {
      redlines.forEach((r, i) => {
        msg += `${i + 1}. ${r.issue}:\n`
        msg += `   Proposed Wording: "${r.proposed_clause}"\n`
        msg += `   Rationale: ${r.win_win_justification}\n\n`
      })
    } else if (risks.length > 0) {
      risks.forEach((r, i) => {
        msg += `${i + 1}. ${r.clause}: ${r.recommendation}\n`
      })
      msg += `\n`
    }

    msg += `Please let us know if these adjustments work for you so we can finalize the contract and commence work right away.\n\n`
    msg += `Best regards,\n${userName}\n${businessName}`

    if (channel === 'whatsapp') {
      const phone = contract.clients?.whatsapp || contract.clients?.phone || ''
      const clean = phone.replace(/\D/g, '')
      const formatted = clean.length === 10 ? `91${clean}` : clean
      return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`
    }

    return msg
  }

  const handleCopyClause = (clauseText: string, idx: number) => {
    navigator.clipboard.writeText(clauseText)
    setCopiedClauseIdx(idx)
    setTimeout(() => setCopiedClauseIdx(null), 2000)
  }

  const handleCopyNegotiationMsg = () => {
    const msg = buildNegotiationMessage('email')
    navigator.clipboard.writeText(msg)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2000)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8;color:#1A140D}

        .cd-root{display:flex;min-height:100vh}
        .cd-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        /* Topbar Header */
        .cd-top{background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;backdrop-filter:blur(10px)}
        .cd-breadcrumb{font-size:11px;color:rgba(26,20,13,.45);margin-bottom:3px;display:flex;align-items:center;gap:6px}
        .cd-breadcrumb-link{color:#1B5E3B;font-weight:600;cursor:pointer;text-decoration:none}
        .cd-breadcrumb-link:hover{text-decoration:underline}
        .cd-top-title{font-family:'Lora',serif;font-size:20px;font-weight:700;color:#1A140D;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
        
        .cd-actions{display:flex;align-items:center;gap:8px}
        .cd-btn-secondary{background:white;border:1px solid rgba(26,20,13,.12);border-radius:9px;padding:8px 14px;font-size:12px;font-weight:600;color:#1A140D;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;transition:all .18s;box-shadow:0 1px 3px rgba(26,20,13,.04)}
        .cd-btn-secondary:hover{border-color:#1B5E3B;color:#1B5E3B;transform:translateY(-1px)}
        
        .cd-btn-primary{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:9px;padding:8px 16px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 3px 10px rgba(27,94,59,.25);transition:all .18s;text-decoration:none}
        .cd-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(27,94,59,.35)}

        /* Layout Body */
        .cd-content{flex:1;padding:24px 28px;display:grid;grid-template-columns:320px 1fr;gap:20px;max-width:1440px;width:100%;margin:0 auto}

        /* Left Metadata Deck (Glassmorphic) */
        .cd-meta-card{background:rgba(253,250,245,.95);border:1px solid rgba(26,20,13,.08);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:16px;box-shadow:0 10px 30px -10px rgba(26,20,13,.05);position:sticky;top:84px;height:fit-content}
        .cd-section-hdr{font-size:10px;font-weight:700;color:rgba(26,20,13,.35);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}

        .cd-val-box{background:linear-gradient(135deg,rgba(27,94,59,.08),rgba(27,94,59,.02));border:1px solid rgba(27,94,59,.15);border-radius:12px;padding:14px}
        .cd-val-amount{font-family:'Lora',serif;font-size:26px;font-weight:700;color:#1B5E3B;letter-spacing:-.02em;margin-top:2px}

        .cd-info-row{display:flex;flex-direction:column;gap:3px;padding:10px 12px;background:white;border:1px solid rgba(26,20,13,.06);border-radius:10px}
        .cd-info-label{font-size:10px;font-weight:600;color:rgba(26,20,13,.45);text-transform:uppercase;letter-spacing:.05em}
        .cd-info-val{font-size:12px;font-weight:600;color:#1A140D;line-height:1.4}

        .cd-client-card{background:white;border:1px solid rgba(26,20,13,.08);border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px}
        .cd-client-avatar{width:36px;height:36px;border-radius:10px;background:rgba(27,94,59,.1);color:#1B5E3B;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
        .cd-client-name{font-size:13px;font-weight:700;color:#1A140D}
        .cd-client-sub{font-size:10px;color:rgba(26,20,13,.45)}

        /* Right Workspace */
        .cd-workspace{display:flex;flex-direction:column;gap:16px}

        /* Kokonut-style Glass Navigation Tabs */
        .cd-tabs-deck{background:rgba(253,250,245,.9);border:1px solid rgba(26,20,13,.08);border-radius:14px;padding:4px;display:flex;gap:4px;box-shadow:0 2px 8px rgba(26,20,13,.03)}
        .cd-tab-btn{flex:1;padding:10px 14px;font-size:12px;font-weight:600;color:rgba(26,20,13,.50);border:none;background:none;font-family:'DM Sans',sans-serif;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .18s;position:relative}
        .cd-tab-btn:hover{color:#1A140D;background:rgba(26,20,13,.03)}
        .cd-tab-btn.active{background:white;color:#1B5E3B;box-shadow:0 2px 10px rgba(26,20,13,.08)}

        .cd-count-pill{font-size:9px;font-weight:700;padding:2px 6px;border-radius:100px;line-height:1}
        .cd-count-pill.red{background:rgba(192,57,43,.12);color:#791F1F}
        .cd-count-pill.green{background:rgba(27,94,59,.12);color:#1B5E3B}

        /* Tab Content Panel */
        .cd-panel{background:#FDFAF5;border:1px solid rgba(26,20,13,.08);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:16px;box-shadow:0 10px 30px -10px rgba(26,20,13,.05)}

        /* AI Summary Header Banner */
        .cd-summary-banner{background:linear-gradient(135deg,rgba(27,94,59,.07),rgba(27,94,59,.02));border:1px solid rgba(27,94,59,.18);border-radius:12px;padding:14px 16px}
        .cd-summary-hdr{font-size:10px;font-weight:700;color:#1B5E3B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;display:flex;align-items:center;gap:4px}
        .cd-summary-text{font-size:12px;color:#1A140D;line-height:1.55}

        /* Motion Card styling for Redlines & Risks */
        .cd-motion-card{background:white;border:1px solid rgba(26,20,13,.08);border-radius:12px;padding:16px;transition:all .2s cubic-bezier(0.16,1,0.3,1);box-shadow:0 2px 6px rgba(26,20,13,.02)}
        .cd-motion-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(26,20,13,.06);border-color:rgba(27,94,59,.25)}

        .cd-clause-code{background:#F7F5F0;border:1px dashed rgba(27,94,59,.25);border-radius:8px;padding:10px 12px;font-family:'Courier New',Courier,monospace;font-size:11px;color:#1A140D;line-height:1.5;margin:8px 0;white-space:pre-wrap}

        .cd-copy-btn{background:white;border:1px solid rgba(27,94,59,.3);color:#1B5E3B;border-radius:7px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .18s}
        .cd-copy-btn:hover{background:#1B5E3B;color:white}
        .cd-copy-btn.copied{background:#1B5E3B;color:white}

        .cd-winwin{font-size:11px;color:rgba(26,20,13,.65);background:rgba(26,20,13,.03);padding:8px 10px;border-radius:8px;display:flex;align-items:flex-start;gap:6px}

        /* Negotiation Draft Box */
        .cd-draft-box{background:white;border:1px solid rgba(26,20,13,.12);border-radius:12px;padding:16px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;line-height:1.6;whiteSpace:'pre-wrap'}

        @media(max-width:960px){
          .cd-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .cd-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .cd-actions{width:100%; flex-wrap:wrap}
          .cd-content{padding:16px; grid-template-columns:1fr}
          .cd-meta-card{position:static}
          .cd-tabs-deck{overflow-x:auto; -webkit-overflow-scrolling:touch}
          .cd-tab-btn{white-space:nowrap; min-width:110px}
        }
        @media(max-width:600px){
          .cd-actions button, .cd-actions a{flex:1; justify-content:center; text-align:center}
        }
      `}</style>

      <div className="cd-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="cd-main">
          {/* Top Header Deck */}
          <div className="cd-top">
            <div>
              <div className="cd-breadcrumb">
                <span className="cd-breadcrumb-link" onClick={() => router.push('/dashboard/contracts')}>Contracts</span>
                <span>/</span>
                <span>{contract.title}</span>
              </div>
              <div className="cd-top-title">
                {contract.title}
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(27,94,59,.08)', color: '#1B5E3B', padding: '3px 8px', borderRadius: 100 }}>
                  ✨ AI Verified
                </span>
              </div>
            </div>

            <div className="cd-actions">
              <button
                className="cd-btn-secondary"
                onClick={() => router.push(`/dashboard/invoices/new?client=${contract.client_id || ''}&contract=${contract.id}`)}
              >
                📄 Create Invoice from Contract
              </button>
              <a
                className="cd-btn-primary"
                href={buildNegotiationMessage('whatsapp')}
                target="_blank"
                rel="noopener noreferrer"
              >
                💬 Open WhatsApp Negotiation
              </a>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="cd-content">
            {/* Left Metadata Deck */}
            <div className="cd-meta-card">
              <div>
                <div className="cd-section-hdr">Contract Value</div>
                <div className="cd-val-box">
                  <div style={{ fontSize: 10, color: 'rgba(26,20,13,.45)', textTransform: 'uppercase', fontWeight: 600 }}>Total Agreed Amount</div>
                  <div className="cd-val-amount">{contract.extracted_amount ? fmtINR(contract.extracted_amount) : '—'}</div>
                </div>
              </div>

              <div>
                <div className="cd-section-hdr">Client Relationship</div>
                {contract.clients ? (
                  <div className="cd-client-card" onClick={() => router.push(`/dashboard/clients/${contract.clients?.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="cd-client-avatar">{contract.clients.name.charAt(0)}</div>
                    <div>
                      <div className="cd-client-name">{contract.clients.name}</div>
                      {contract.clients.company_name && <div className="cd-client-sub">{contract.clients.company_name}</div>}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#E8692A', background: 'rgba(232,105,42,.08)', padding: '8px 12px', borderRadius: 8 }}>
                    ⚠️ No client linked to this contract yet
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="cd-section-hdr">Extracted Contract Terms</div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Payment Terms</span>
                  <span className="cd-info-val">{contract.extracted_payment_terms || '—'}</span>
                </div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Late Fee Clause</span>
                  <span className="cd-info-val">{contract.extracted_late_fee || '—'}</span>
                </div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Scope of Work Summary</span>
                  <span className="cd-info-val" style={{ fontSize: 11, fontWeight: 400 }}>{contract.extracted_scope || '—'}</span>
                </div>
                <div className="cd-info-row">
                  <span className="cd-info-label">Added Date</span>
                  <span className="cd-info-val">{fmtDate(contract.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Right Main Workspace */}
            <div className="cd-workspace">
              {/* Kokonut UI Tab Deck */}
              <div className="cd-tabs-deck">
                <button
                  className={`cd-tab-btn ${activeTab === 'redlines' ? 'active' : ''}`}
                  onClick={() => setActiveTab('redlines')}
                >
                  🛡️ MSME Counter-Proposals
                  {redlines.length > 0 && <span className="cd-count-pill green">{redlines.length}</span>}
                </button>
                <button
                  className={`cd-tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('risks')}
                >
                  ⚠️ Legal Risks & Missing Clauses
                  {(highRisks > 0 || medRisks > 0) && <span className="cd-count-pill red">{highRisks + medRisks}</span>}
                </button>
                <button
                  className={`cd-tab-btn ${activeTab === 'negotiation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('negotiation')}
                >
                  ✉️ Client Negotiation Draft
                </button>
              </div>

              {/* Panel Container */}
              <div className="cd-panel">
                {summary && (
                  <div className="cd-summary-banner">
                    <div className="cd-summary-hdr">✨ Executive AI Summary</div>
                    <div className="cd-summary-text">{summary}</div>
                  </div>
                )}

                {/* ── TAB 1: COUNTER-PROPOSALS (MSME REDLINES) ── */}
                {activeTab === 'redlines' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {redlines.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1B5E3B', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                          🛡️ Ready-to-Copy Counter Clauses for Client Negotiation
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {redlines.map((r, idx) => (
                            <div key={idx} className="cd-motion-card">
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A140D' }}>{r.issue}</span>
                                <button
                                  className={`cd-copy-btn ${copiedClauseIdx === idx ? 'copied' : ''}`}
                                  onClick={() => handleCopyClause(r.proposed_clause, idx)}
                                >
                                  {copiedClauseIdx === idx ? '✓ Wording Copied' : '📋 Copy Clause Wording'}
                                </button>
                              </div>

                              <div style={{ fontSize: 11, color: '#791F1F', background: 'rgba(192,57,43,.05)', padding: '6px 10px', borderRadius: 6, marginBottom: 8, lineHeight: 1.45 }}>
                                <strong>Client Risk:</strong> {r.current_risk}
                              </div>

                              <div className="cd-clause-code">
                                <div style={{ fontSize: 9, fontWeight: 700, color: '#1B5E3B', textTransform: 'uppercase', marginBottom: 4 }}>Proposed Replacement Wording:</div>
                                {r.proposed_clause}
                              </div>

                              <div className="cd-winwin">
                                <span>🤝</span>
                                <div><strong>Win-Win Justification:</strong> {r.win_win_justification}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MSME Statutory Legal Rights (India) */}
                    {msmeRights.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                          ⚖️ Statutory Indian MSME Rights (MSMED Act 2006)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {msmeRights.map((m, idx) => (
                            <div key={idx} style={{ background: 'rgba(24,95,165,.04)', border: '1px solid rgba(24,95,165,.18)', borderRadius: 10, padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#0C447C' }}>{m.right_name}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(24,95,165,.12)', color: '#185FA5', padding: '2px 8px', borderRadius: 4 }}>
                                  {m.legal_reference}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: '#1A140D', lineHeight: 1.5 }}>
                                {m.explanation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: LEGAL RISKS & MISSING CLAUSES ── */}
                {activeTab === 'risks' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {risks.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#791F1F', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                          ⚠️ Identified Contract Risks & Loopholes
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {risks.map((r, i) => {
                            const cfg = RISK_CFG[r.risk_level] || RISK_CFG.medium
                            return (
                              <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <span>{cfg.emoji}</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                                  <span style={{ fontSize: 11, color: 'rgba(26,20,13,.5)', marginLeft: 'auto', fontWeight: 600 }}>{r.clause}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#1A140D', lineHeight: 1.5, marginBottom: 8 }}>{r.description}</div>
                                <div style={{ fontSize: 11, color: '#1B5E3B', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                  <span>💡</span> {r.recommendation}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {missing.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,20,13,.45)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
                          📋 Missing Standard Clauses
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {missing.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'white', border: '1px solid rgba(26,20,13,.08)', borderRadius: 10 }}>
                              <span style={{ fontSize: 14 }}>📑</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A140D' }}>{m.clause}</div>
                                <div style={{ fontSize: 11, color: 'rgba(26,20,13,.55)', marginTop: 2, lineHeight: 1.45 }}>{m.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 3: NEGOTIATION MESSAGE BUILDER ── */}
                {activeTab === 'negotiation' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A140D' }}>Client Negotiation Email & Message Draft</div>
                        <div style={{ fontSize: 11, color: 'rgba(26,20,13,.45)', marginTop: 2 }}>Auto-compiled with all your counter-proposals and win-win rationale</div>
                      </div>
                      <button
                        className={`cd-copy-btn ${copiedMsg ? 'copied' : ''}`}
                        onClick={handleCopyNegotiationMsg}
                      >
                        {copiedMsg ? '✓ Message Copied' : '📋 Copy Full Message'}
                      </button>
                    </div>

                    <div className="cd-draft-box">
                      {buildNegotiationMessage('email')}
                    </div>
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
