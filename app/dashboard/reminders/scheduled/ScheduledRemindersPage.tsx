'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

// ── Types ──────────────────────────────────────────────────────
interface ClientInfo {
  id: string; name: string; company_name: string | null
  whatsapp: string | null; phone: string | null
}
interface InvoiceInfo {
  id: string; invoice_number: string; total_amount: number
  amount_due: number; due_date: string; status: string
  clients: ClientInfo | null
}
interface Reminder {
  id: string; invoice_id: string; channel: string; status: string
  scheduled_at: string | null; sent_at: string | null
  days_overdue: number | null; used_contract_context: boolean | null
  invoices: InvoiceInfo | null
}
interface Props {
  reminders: Reminder[]; userName: string; userEmail: string; businessName: string
}

// ── Helpers ────────────────────────────────────────────────────
function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function daysUntil(d: string | null) {
  if (!d) return null
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  return diff
}

function getSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

const DAY_CFG: Record<number, { label: string; emoji: string; color: string; bg: string }> = {
  7:  { label: 'Polite Reminder', emoji: '💬', color: '#185FA5', bg: 'rgba(24,95,165,.08)' },
  14: { label: 'Follow-up + PDF', emoji: '📎', color: '#C85A1A', bg: 'rgba(200,90,26,.08)' },
  30: { label: 'Firm Reminder',   emoji: '⚖️', color: '#7C3AED', bg: 'rgba(124,58,237,.08)' },
}

export default function ScheduledRemindersClient({
  reminders: initialReminders, userName, userEmail, businessName,
}: Props) {
  const router = useRouter()
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return reminders
    const q = search.toLowerCase()
    return reminders.filter(r => {
      const name = r.invoices?.clients?.name?.toLowerCase() || ''
      const inv = r.invoices?.invoice_number?.toLowerCase() || ''
      return name.includes(q) || inv.includes(q)
    })
  }, [reminders, search])

  // Group by time buckets
  const groups = useMemo(() => {
    const today: Reminder[] = []
    const thisWeek: Reminder[] = []
    const later: Reminder[] = []
    const overdue: Reminder[] = []

    filtered.forEach(r => {
      const d = daysUntil(r.scheduled_at)
      if (d === null) later.push(r)
      else if (d < 0) overdue.push(r)
      else if (d === 0) today.push(r)
      else if (d <= 7) thisWeek.push(r)
      else later.push(r)
    })

    return [
      { title: '⚡ Overdue', items: overdue, accent: '#C0392B' },
      { title: '📌 Today', items: today, accent: '#E8692A' },
      { title: '📅 Next 7 Days', items: thisWeek, accent: '#185FA5' },
      { title: '🗓️ Later', items: later, accent: 'rgba(26,20,13,.40)' },
    ].filter(g => g.items.length > 0)
  }, [filtered])

  // Metrics
  const totalScheduled = reminders.length
  const totalValue = reminders.reduce((acc, r) => acc + Number(r.invoices?.amount_due || 0), 0)
  const overdueCount = reminders.filter(r => daysUntil(r.scheduled_at) !== null && daysUntil(r.scheduled_at)! < 0).length

  // Skip a reminder
  const handleSkip = async (id: string) => {
    if (!confirm('Skip this reminder? It won\'t be sent.')) return
    try {
      const sb = getSupabase()
      const { error } = await sb.from('reminders').update({ status: 'skipped' }).eq('id', id)
      if (error) throw error
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch (e) { console.error(e); alert('Error skipping reminder.') }
  }

  // Send now via WhatsApp
  const getWhatsAppLink = (r: Reminder) => {
    const phone = r.invoices?.clients?.whatsapp || r.invoices?.clients?.phone || ''
    const clean = phone.replace(/\D/g, '')
    const formatted = clean.length === 10 ? `91${clean}` : clean
    const clientName = r.invoices?.clients?.name || 'Client'
    const invNum = r.invoices?.invoice_number || 'Invoice'
    const amount = r.invoices?.amount_due ? fmtINR(r.invoices.amount_due) : 'the due amount'
    const days = r.days_overdue || 7
    const msg = `Namaste ${clientName} garu, this is a reminder from ${businessName} regarding Invoice #${invNum} for ${amount}, which is overdue by ${days} days. Please review and make payment at your earliest convenience. Thank you!`
    return `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .sr-root{display:flex;min-height:100vh}
        .sr-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        .sr-top{background:#FDFAF5;border-bottom:.5px solid rgba(26,20,13,.08);padding:14px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .sr-top-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .sr-top-sub{font-size:11px;color:rgba(26,20,13,.38);margin-top:2px}

        .sr-content{flex:1;padding:24px 28px;display:flex;flex-direction:column;gap:16px}

        .sr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .sr-stat{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;padding:14px 16px}
        .sr-stat-label{font-size:10px;font-weight:500;color:rgba(26,20,13,.40);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .sr-stat-val{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#1A140D;letter-spacing:-.02em;line-height:1}

        .sr-search{background:white;border:.5px solid rgba(26,20,13,.12);border-radius:8px;padding:7px 12px;font-family:'DM Sans',sans-serif;font-size:12px;color:#1A140D;outline:none;width:240px}
        .sr-search:focus{border-color:#2D8A58}

        .sr-group-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px;display:flex;align-items:center;gap:6px}

        .sr-card{background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px;transition:box-shadow .18s,transform .18s;cursor:default}
        .sr-card:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,20,13,.06)}

        .sr-day-badge{width:42px;height:42px;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
        .sr-day-badge-emoji{font-size:14px;line-height:1}
        .sr-day-badge-label{font-size:7px;font-weight:700;text-transform:uppercase;margin-top:2px}

        .sr-card-info{flex:1;min-width:0}
        .sr-card-client{font-size:13px;font-weight:600;color:#1A140D}
        .sr-card-sub{font-size:10px;color:rgba(26,20,13,.45);margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}

        .sr-card-amount{font-family:'Lora',serif;font-size:14px;font-weight:700;color:#1A140D;text-align:right;flex-shrink:0;min-width:80px}

        .sr-card-date{text-align:right;flex-shrink:0;min-width:90px}
        .sr-card-date-main{font-size:11px;font-weight:600;color:#1A140D}
        .sr-card-date-sub{font-size:9px;color:rgba(26,20,13,.40);margin-top:1px}

        .sr-card-actions{display:flex;gap:6px;flex-shrink:0}
        .sr-btn-wa{background:#25D366;border:none;border-radius:6px;padding:6px 10px;font-size:10px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:none;display:flex;align-items:center;gap:3px}
        .sr-btn-wa:hover{opacity:.9}
        .sr-btn-skip{background:none;border:.5px solid rgba(26,20,13,.12);border-radius:6px;padding:6px 10px;font-size:10px;font-weight:500;color:rgba(26,20,13,.45);cursor:pointer;font-family:'DM Sans',sans-serif}
        .sr-btn-skip:hover{border-color:rgba(26,20,13,.25);color:rgba(26,20,13,.65)}
        .sr-inv-link{font-size:10px;color:#1B5E3B;font-weight:600;cursor:pointer}
        .sr-inv-link:hover{text-decoration:underline}

        .sr-empty{text-align:center;padding:48px 20px;background:#FDFAF5;border:.5px solid rgba(26,20,13,.08);border-radius:16px}
        .sr-empty-icon{font-size:36px;margin-bottom:12px}
        .sr-empty-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;margin-bottom:6px}
        .sr-empty-sub{font-size:12px;color:rgba(26,20,13,.45);line-height:1.5}

        @media(max-width:900px){
          .sr-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .sr-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .sr-search{width:100%}
          .sr-content{padding:16px}
          .sr-stats{grid-template-columns:1fr 1fr}
          .sr-card{flex-wrap:wrap; gap:12px}
          .sr-card-actions{width:100%; justify-content:flex-end}
        }
        @media(max-width:600px){
          .sr-stats{grid-template-columns:1fr}
          .sr-card-amount, .sr-card-date{text-align:left}
        }
      `}</style>

      <div className="sr-root">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="sr-main">
          <div className="sr-top">
            <div>
              <div className="sr-top-title">Scheduled Reminders</div>
              <div className="sr-top-sub">Upcoming WhatsApp payment follow-ups</div>
            </div>
            <input className="sr-search" placeholder="Search client or invoice..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="sr-content">
            {/* Stats */}
            <div className="sr-stats">
              <div className="sr-stat">
                <div className="sr-stat-label">Pending Reminders</div>
                <div className="sr-stat-val" style={{ color: '#185FA5' }}>{totalScheduled}</div>
              </div>
              <div className="sr-stat">
                <div className="sr-stat-label">Outstanding Value</div>
                <div className="sr-stat-val">{fmtINR(totalValue)}</div>
              </div>
              <div className="sr-stat">
                <div className="sr-stat-label">Overdue Reminders</div>
                <div className="sr-stat-val" style={{ color: overdueCount > 0 ? '#C0392B' : '#1B5E3B' }}>{overdueCount}</div>
              </div>
            </div>

            {/* Groups */}
            {groups.length === 0 ? (
              <div className="sr-empty">
                <div className="sr-empty-icon">✅</div>
                <div className="sr-empty-title">No scheduled reminders</div>
                <div className="sr-empty-sub">
                  {search ? 'No matches for your search.' : 'All clear! Reminders are automatically created when invoices are sent.'}
                </div>
              </div>
            ) : (
              groups.map(group => (
                <div key={group.title}>
                  <div className="sr-group-title" style={{ color: group.accent }}>
                    {group.title}
                    <span style={{ fontSize: 9, fontWeight: 500, color: 'rgba(26,20,13,.35)' }}>({group.items.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map(r => {
                      const dayCfg = DAY_CFG[r.days_overdue || 7] || DAY_CFG[7]
                      const d = daysUntil(r.scheduled_at)
                      const client = r.invoices?.clients
                      const inv = r.invoices
                      return (
                        <div className="sr-card" key={r.id}>
                          <div className="sr-day-badge" style={{ background: dayCfg.bg }}>
                            <span className="sr-day-badge-emoji">{dayCfg.emoji}</span>
                            <span className="sr-day-badge-label" style={{ color: dayCfg.color }}>Day {r.days_overdue || '?'}</span>
                          </div>

                          <div className="sr-card-info">
                            <div className="sr-card-client">{client?.name || 'Unknown'}</div>
                            <div className="sr-card-sub">
                              {inv && (
                                <span className="sr-inv-link" onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}>
                                  {inv.invoice_number}
                                </span>
                              )}
                              <span>💬 WhatsApp</span>
                              {r.used_contract_context && <span style={{ color: '#1B5E3B', fontWeight: 500 }}>📜 Contract clause</span>}
                            </div>
                          </div>

                          <div className="sr-card-amount">{inv ? fmtINR(inv.amount_due) : '—'}</div>

                          <div className="sr-card-date">
                            <div className="sr-card-date-main">{fmtDate(r.scheduled_at)}</div>
                            <div className="sr-card-date-sub" style={{ color: d !== null && d < 0 ? '#C0392B' : undefined }}>
                              {d === null ? '' : d === 0 ? 'Today' : d < 0 ? `${Math.abs(d)}d overdue` : `in ${d}d`}
                            </div>
                          </div>

                          <div className="sr-card-actions">
                            <a className="sr-btn-wa" href={getWhatsAppLink(r)} target="_blank" rel="noopener noreferrer">Send Now</a>
                            <button className="sr-btn-skip" onClick={() => handleSkip(r.id)}>Skip</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
