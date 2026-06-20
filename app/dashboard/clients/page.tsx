'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  city: string | null
  total_invoiced: number
  total_paid: number
  avg_payment_days: number | null
  created_at: string
}

function fmtINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`
  return `₹${Math.round(n)}`
}

const COLORS = ['#1B5E3B','#185FA5','#854F0B','#7C3AED','#C85A1A','#0F766E']
function clientColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [search,  setSearch]    = useState('')
  const [userName,  setUserName]  = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(profile?.full_name || user.email?.split('@')[0] || '')

      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      setClients(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #F7F5F0; font-family: 'DM Sans', sans-serif; }

        .cl-wrap { display: flex; min-height: 100vh; }
        .cl-main { flex: 1; margin-left: 200px; display: flex; flex-direction: column; }

        .cl-top {
          background: #FDFAF5;
          border-bottom: .5px solid rgba(26,20,13,.08);
          padding: 14px 28px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 40;
        }

        .cl-top-title { font-family: 'Lora', serif; font-size: 18px; font-weight: 700; color: #1A140D; letter-spacing: -.02em; }
        .cl-top-sub   { font-size: 11px; color: rgba(26,20,13,.38); margin-top: 2px; }

        .cl-top-right { display: flex; align-items: center; gap: 10px; }

        .cl-search {
          background: white; border: .5px solid rgba(26,20,13,.11);
          border-radius: 8px; padding: 7px 12px 7px 34px;
          font-family: 'DM Sans', sans-serif; font-size: 12px; color: #1A140D;
          outline: none; width: 200px; transition: all .18s;
          position: relative;
        }
        .cl-search:focus { border-color: #2D8A58; box-shadow: 0 0 0 3px rgba(45,138,88,.09); width: 240px; }
        .cl-search::placeholder { color: rgba(26,20,13,.28); }
        .cl-search-wrap { position: relative; }
        .cl-search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }

        .cl-btn {
          background: #1B5E3B; border: none; border-radius: 8px;
          padding: 8px 16px; font-size: 12px; font-weight: 600; color: white;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 2px 8px rgba(27,94,59,.25);
          transition: all .18s;
        }
        .cl-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(27,94,59,.32); }

        .cl-content { flex: 1; padding: 24px 28px; }

        .cl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 10px;
        }

        .cl-card {
          background: #FDFAF5;
          border: .5px solid rgba(26,20,13,.08);
          border-radius: 10px; padding: 16px;
          cursor: pointer; transition: all .18s;
        }
        .cl-card:hover { box-shadow: 0 4px 16px rgba(26,20,13,.08); transform: translateY(-1px); }

        .cl-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }

        .cl-av {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: white; flex-shrink: 0;
        }

        .cl-name    { font-size: 13px; font-weight: 600; color: #1A140D; line-height: 1; margin-bottom: 3px; }
        .cl-company { font-size: 10px; color: rgba(26,20,13,.45); margin-bottom: 2px; }
        .cl-city    { font-size: 10px; color: rgba(26,20,13,.35); }

        .cl-card-stats {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1px; background: rgba(26,20,13,.07);
          border-radius: 7px; overflow: hidden;
        }

        .cl-stat { background: #F7F5F0; padding: 8px 10px; }
        .cl-stat-l { font-size: 8px; font-weight: 500; color: rgba(26,20,13,.38); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 3px; }
        .cl-stat-n { font-size: 14px; font-weight: 700; color: #1A140D; letter-spacing: -.01em; line-height: 1; }

        .cl-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 10px; padding-top: 10px;
          border-top: .5px solid rgba(26,20,13,.06);
        }

        .cl-contact { display: flex; align-items: center; gap: 5px; }
        .cl-contact-icon { font-size: 12px; }
        .cl-contact-val { font-size: 10px; color: rgba(26,20,13,.50); }

        .cl-new-inv {
          font-size: 9px; font-weight: 600; color: #1B5E3B;
          background: rgba(27,94,59,.08); border: none; border-radius: 5px;
          padding: 3px 8px; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
        }

        .cl-empty {
          grid-column: 1 / -1;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; gap: 12px; text-align: center;
        }

        .cl-empty-icon { font-size: 36px; }
        .cl-empty-title { font-size: 16px; font-weight: 600; color: #1A140D; }
        .cl-empty-sub { font-size: 13px; color: rgba(26,20,13,.45); max-width: 300px; line-height: 1.55; }
        .cl-empty-btn {
          background: #1B5E3B; border: none; border-radius: 8px;
          padding: 9px 20px; font-size: 13px; font-weight: 600; color: white;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          margin-top: 4px;
        }

        .cl-skeleton {
          background: linear-gradient(90deg, rgba(26,20,13,.04) 0%, rgba(26,20,13,.08) 50%, rgba(26,20,13,.04) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px; height: 130px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
      `}</style>

      <div className="cl-wrap">
        <Sidebar userName={userName} userEmail={userEmail} />

        <div className="cl-main">
          <div className="cl-top">
            <div>
              <div className="cl-top-title">Clients</div>
              <div className="cl-top-sub">
                {loading ? 'Loading...' : `${clients.length} client${clients.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="cl-top-right">
              <div className="cl-search-wrap">
                <svg className="cl-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(26,20,13,.35)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className="cl-search"
                  placeholder="Search clients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="cl-btn" onClick={() => router.push('/dashboard/clients/new')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add client
              </button>
            </div>
          </div>

          <div className="cl-content">
            <div className="cl-grid">
              {loading ? (
                Array(6).fill(0).map((_, i) => <div key={i} className="cl-skeleton" />)
              ) : filtered.length === 0 ? (
                <div className="cl-empty">
                  <div className="cl-empty-icon">🤝</div>
                  <div className="cl-empty-title">
                    {search ? 'No clients found' : 'No clients yet'}
                  </div>
                  <div className="cl-empty-sub">
                    {search
                      ? `No results for "${search}". Try a different name or city.`
                      : 'Add your first client to start creating invoices and tracking payments.'
                    }
                  </div>
                  {!search && (
                    <button className="cl-empty-btn" onClick={() => router.push('/dashboard/clients/new')}>
                      Add first client
                    </button>
                  )}
                </div>
              ) : (
                filtered.map(c => (
                  <div
                    key={c.id}
                    className="cl-card"
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                  >
                    <div className="cl-card-top">
                      <div className="cl-av" style={{ background: clientColor(c.name) }}>
                        {initials(c.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cl-name">{c.name}</div>
                        {c.company_name && <div className="cl-company">{c.company_name}</div>}
                        {c.city && <div className="cl-city">📍 {c.city}</div>}
                      </div>
                    </div>

                    <div className="cl-card-stats">
                      <div className="cl-stat">
                        <div className="cl-stat-l">Total invoiced</div>
                        <div className="cl-stat-n">{fmtINR(c.total_invoiced || 0)}</div>
                      </div>
                      <div className="cl-stat">
                        <div className="cl-stat-l">Avg payment</div>
                        <div className="cl-stat-n">
                          {c.avg_payment_days ? `${c.avg_payment_days}d` : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="cl-card-footer">
                      <div className="cl-contact">
                        <span className="cl-contact-icon">💬</span>
                        <span className="cl-contact-val">{c.whatsapp || c.phone || 'No number'}</span>
                      </div>
                      <button
                        className="cl-new-inv"
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/invoices/new?client=${c.id}`) }}
                      >
                        + Invoice
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}