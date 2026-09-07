'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars in .env.local')
  return createBrowserClient(url, key)
}

const INVOICES = [
  { name: 'Infosys Project · INV-041', amount: '₹1,20,000', pct: 100, color: '#10B981', status: 'Paid · 3 days ago via UPI',       dot: '#10B981' },
  { name: 'Cyient Ltd · INV-042',      amount: '₹85,000',   pct: 60,  color: '#F59E0B', status: 'Reminder sent · 12 days overdue', dot: '#F59E0B' },
  { name: 'TCS Vendor · INV-043',      amount: '₹2,40,000', pct: 25,  color: '#6B7280', status: 'Invoice sent · Due in 18 days',    dot: '#6B7280' },
]

export default function LoginPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [lang, setLang]       = useState<'en' | 'te'>('en')
  const [count, setCount]     = useState(0)
  const [visible, setVisible] = useState(false)

  // mount animation
  useEffect(() => { setVisible(true) }, [])

  // counter ₹0 → ₹2.4L
  useEffect(() => {
    const target = 240000, dur = 1800
    let s: number | null = null
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const raf = (ts: number) => {
      if (!s) s = ts
      const p = Math.min((ts - s) / dur, 1)
      setCount(Math.floor(ease(p) * target))
      if (p < 1) requestAnimationFrame(raf)
    }
    const id = setTimeout(() => requestAnimationFrame(raf), 500)
    return () => clearTimeout(id)
  }, [])

  const fmt = (n: number) =>
    n >= 240000 ? '₹2.4L' :
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` :
    n >= 1000   ? `₹${Math.floor(n / 1000)}K` : `₹${n}`

  const signInGoogle = async () => {
    setLoading(true); setError('')
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const signInEmail = async () => {
    if (!email.includes('@')) { setError('Please enter a valid email address'); return }
    setLoading(true); setError('')
    try {
      const { error } = await getSupabase().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      setSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  const te = lang === 'te'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Lora:ital,wght@0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; background-color: #080E0A; }

        /* ── ROOT ── */
        .vsl { height: 100vh; display: grid; grid-template-columns: 1fr 420px; font-family: 'Outfit', sans-serif; overflow: hidden; }

        /* ─────────── LEFT PANEL (Kokonut Dark Glossy) ─────────── */
        .L {
          background: #080E0A;
          display: flex; flex-direction: column;
          padding: 36px 48px;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(-20px);
          transition: opacity .6s cubic-bezier(0.16,1,0.3,1), transform .6s cubic-bezier(0.16,1,0.3,1);
        }
        .L.in { opacity: 1; transform: translateX(0); }

        /* Ambient Glowing Animated Orbs */
        .L::before {
          content: '';
          position: absolute; inset: -100px; pointer-events: none;
          background:
            radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.18) 0%, transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(5, 150, 105, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 55%);
          animation: kokonut-orb-float 12s ease-in-out infinite alternate;
        }

        @keyframes kokonut-orb-float {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.1) translate(15px, -15px); }
        }

        /* Subtle grid lines */
        .L::after {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .z { position: relative; z-index: 1; }

        /* Logo */
        .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; flex-shrink: 0; }
        .logo-mark {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #10B981, #059669); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .logo-name { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -.02em; line-height: 1; }
        .logo-sub  { font-size: 10px; color: rgba(255,255,255,.45); margin-top: 2px; font-weight: 500; }

        /* Tag Pill */
        .tag {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 100px;
          padding: 5px 14px; font-size: 11px; font-weight: 600; color: #34D399;
          width: fit-content; margin-bottom: 18px; flex-shrink: 0;
          background: rgba(16, 185, 129, 0.1); backdrop-filter: blur(10px);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);
        }
        .tag-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981; animation: kokonut-pulse 2s infinite; }

        /* Headline */
        .h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(28px, 2.8vw, 42px);
          font-weight: 800; line-height: 1.1; letter-spacing: -.03em;
          color: #FFFFFF; margin-bottom: 12px; flex-shrink: 0;
        }
        .h1 .g {
          background: linear-gradient(135deg, #34D399 0%, #10B981 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .desc {
          font-size: 14px; font-weight: 400; color: rgba(255,255,255,.6);
          line-height: 1.6; margin-bottom: 24px; flex-shrink: 0; max-width: 480px;
        }

        /* ── DASHBOARD GLOSSY PREVIEW ── */
        .preview-wrap {
          flex: 1; display: flex; flex-direction: column;
          min-height: 0; gap: 10px;
        }

        .preview-label {
          font-size: 10px; font-weight: 700; color: rgba(255,255,255,.35);
          text-transform: uppercase; letter-spacing: .12em; margin-bottom: 4px; flex-shrink: 0;
        }

        /* Summary Glossy Cells */
        .summary {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 8px; flex-shrink: 0;
        }
        .summary-cell {
          background: rgba(18, 30, 22, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px; padding: 12px 14px;
        }
        .summary-n { font-size: 18px; font-weight: 700; color: #FFFFFF; line-height: 1; margin-bottom: 4px; }
        .summary-l { font-size: 9px; color: rgba(255,255,255,.45); font-weight: 500; }

        /* Invoice Rows */
        .invoices { flex: 1; display: flex; flex-direction: column; gap: 8px; min-height: 0; }

        .inv {
          background: rgba(18, 30, 22, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px; padding: 12px 14px;
          display: flex; flex-direction: column; justify-content: space-between;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .inv:hover { transform: translateY(-2px); border-color: rgba(16, 185, 129, 0.3); background: rgba(22, 36, 26, 0.8); }

        .inv-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .inv-name { font-size: 12px; font-weight: 600; color: #FFFFFF; }
        .inv-amount { font-size: 13px; font-weight: 700; color: #34D399; }
        .inv-track { height: 4px; background: rgba(255,255,255,.08); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
        .inv-fill  { height: 100%; border-radius: 4px; transition: width .8s cubic-bezier(0.16,1,0.3,1); }
        .inv-bottom { display: flex; align-items: center; gap: 6px; }
        .inv-dot   { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .inv-status { font-size: 10px; color: rgba(255,255,255,.5); font-weight: 500; }

        /* Bottom Counter Card */
        .btm { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex-shrink: 0; }

        .counter {
          background: rgba(18, 30, 22, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 3px solid #10B981;
          border-radius: 12px; padding: 12px 14px;
        }
        .counter-lbl { font-size: 9px; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
        .counter-num { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -.02em; line-height: 1; margin-bottom: 3px; }
        .counter-sub { font-size: 9px; color: rgba(255,255,255,.45); }

        .testi {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px; padding: 12px 14px;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .testi-q    { font-size: 10px; color: rgba(255,255,255,.8); line-height: 1.5; font-style: italic; margin-bottom: 8px; }
        .testi-row  { display: flex; align-items: center; gap: 8px; }
        .testi-av   { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg,#10B981,#059669); display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 700; color: white; flex-shrink: 0; }
        .testi-name { font-size: 10px; font-weight: 600; color: #FFFFFF; }
        .testi-role { font-size: 8px; color: rgba(255,255,255,.4); margin-top: 1px; }

        /* ─────────── RIGHT FORM PANEL (Glossy Kokonut Card) ─────────── */
        .R {
          background: rgba(12, 22, 15, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex; flex-direction: column; justify-content: center;
          padding: 40px 36px;
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(20px);
          transition: opacity .6s .15s cubic-bezier(0.16,1,0.3,1), transform .6s .15s cubic-bezier(0.16,1,0.3,1);
          box-shadow: -15px 0 40px rgba(0, 0, 0, 0.6);
        }
        .R.in { opacity: 1; transform: translateX(0); }

        /* Glowing Neon Top Bar */
        .R::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #10B981 0%, #34D399 50%, #F59E0B 100%);
          box-shadow: 0 0 12px #10B981;
        }

        .rf { position: relative; z-index: 1; }

        /* Language Toggle */
        .lang {
          position: absolute; top: 20px; right: 20px; z-index: 2;
          display: flex; gap: 2px;
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px; padding: 3px;
        }
        .lang button {
          padding: 4px 12px; border-radius: 100px; border: none;
          font-size: 10px; font-weight: 600; cursor: pointer;
          transition: all .2s; font-family: 'Outfit', sans-serif;
          background: transparent; color: rgba(255,255,255,.4);
        }
        .lang button.on { background: #10B981; color: white; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }

        /* Form Header */
        .f-ey   { font-size: 10px; font-weight: 700; color: #34D399; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; }
        .f-h2   { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -.02em; line-height: 1.15; margin-bottom: 4px; }
        .f-desc { font-size: 13px; font-weight: 400; color: rgba(255,255,255,.55); line-height: 1.55; margin-bottom: 20px; }

        /* Feature Pills */
        .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
        .pill  { display: flex; align-items: center; gap: 5px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 100px; padding: 4px 10px; font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, 0.7); }
        .pill-dot { width: 4px; height: 4px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px #10B981; }

        /* Glossy Google OAuth Button with Shimmer */
        .g-btn {
          width: 100%; display: flex; align-items: center; gap: 10px;
          background: white; border: none;
          border-radius: 12px; padding: 12px 16px; cursor: pointer;
          transition: all .2s cubic-bezier(0.16,1,0.3,1); margin-bottom: 14px;
          font-family: 'Outfit', sans-serif;
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.1);
          position: relative; overflow: hidden;
        }
        .g-btn::after {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: linear-gradient(60deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: rotate(30deg); animation: kokonut-shimmer 3s infinite;
        }
        @keyframes kokonut-shimmer { 0% { transform: translate(-100%, -100%) rotate(30deg); } 100% { transform: translate(100%, 100%) rotate(30deg); } }

        .g-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255, 255, 255, 0.2); }
        .g-btn:disabled { opacity: .68; cursor: not-allowed; }
        .g-label { font-size: 13px; font-weight: 600; color: #111827; flex: 1; text-align: left; }
        .g-badge { font-size: 9px; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: #059669; padding: 2px 8px; border-radius: 100px; }

        /* Divider */
        .or      { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .or-line { flex: 1; height: 1px; background: rgba(255,255,255,.08); }
        .or-text { font-size: 10px; color: rgba(255,255,255,.3); font-weight: 600; text-transform: uppercase; letter-spacing: .08em; }

        /* Input */
        .inp-wrap { position: relative; margin-bottom: 10px; }
        .inp-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,.3); font-size: 14px; pointer-events: none; }
        .inp {
          width: 100%; background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px;
          padding: 12px 14px 12px 38px;
          font-family: 'Outfit', sans-serif; font-size: 13px; color: #FFFFFF;
          transition: all .2s; outline: none;
        }
        .inp::placeholder { color: rgba(255,255,255,.3); }
        .inp:focus { border-color: #10B981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); background: rgba(255, 255, 255, 0.08); }

        /* Neon CTA */
        .cta {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none; border-radius: 12px; padding: 12px;
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 700; color: white;
          cursor: pointer; transition: all .2s cubic-bezier(0.16,1,0.3,1); margin-bottom: 16px;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
        }
        .cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5); }
        .cta:disabled { opacity: .75; cursor: not-allowed; }

        /* Mobile */
        @media (max-width: 860px) {
          .vsl { grid-template-columns: 1fr; height: 100vh; overflow-y: auto; }
          .L    { display: none; }
          .R    { min-height: 100vh; padding: 32px 20px; justify-content: center; }
          html, body { overflow: auto; }
        }
      `}</style>

      <div className="vsl">
        {/* LEFT PANEL */}
        <div className={`L ${visible ? 'in' : ''}`}>
          <div className="z" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

            {/* Logo */}
            <div className="logo">
              <div className="logo-mark" style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
                <img src="/settlr-logo.png" alt="Settlr" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
              </div>
              <div>
                <div className="logo-name">Settlr</div>
                <div className="logo-sub">MSME Financial Operating System</div>
              </div>
            </div>

            {/* Tag */}
            <div className="tag">
              <span className="tag-dot" />
              <span>MSME Invoicing, GST & Payment Recovery Platform</span>
            </div>

            {/* Headline */}
            <h1 className="h1">
              Collect payments <span className="g">faster</span> & file GST <span style={{ color: '#F59E0B' }}>effortlessly</span>
            </h1>

            <p className="desc">
              Automated WhatsApp reminders, 45-day MSMED Act interest claims, dynamic NPCI UPI QR billing, and 1-click GSTR-1 tax filing — purpose-built for Indian freelancers, contractors, and MSMEs.
            </p>

            {/* Preview Section */}
            <div className="preview-wrap">
              <div className="preview-label">Live MSME Payment Track</div>

              <div className="summary">
                <div className="summary-cell">
                  <div className="summary-n">{fmt(count)}</div>
                  <div className="summary-l">Collected this month</div>
                </div>
                <div className="summary-cell">
                  <div className="summary-n">3</div>
                  <div className="summary-l">Pending invoices</div>
                </div>
                <div className="summary-cell">
                  <div className="summary-n" style={{ color: '#34D399' }}>100%</div>
                  <div className="summary-l">GSTR-1 Ready</div>
                </div>
              </div>

              <div className="invoices">
                {INVOICES.map((inv, i) => (
                  <div className="inv" key={i}>
                    <div className="inv-top">
                      <span className="inv-name">{inv.name}</span>
                      <span className="inv-amount">{inv.amount}</span>
                    </div>
                    <div className="inv-track">
                      <div className="inv-fill" style={{ width: visible ? `${inv.pct}%` : '0%', background: inv.color }} />
                    </div>
                    <div className="inv-bottom">
                      <div className="inv-dot" style={{ background: inv.dot }} />
                      <span className="inv-status">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="btm">
                <div className="counter">
                  <div className="counter-lbl">Overdue Recovered</div>
                  <div className="counter-num">{fmt(count)}</div>
                  <div className="counter-sub">Via Automated WhatsApp</div>
                </div>

                <div className="testi">
                  <div className="testi-q">&ldquo;Settlr saved us ₹4.5L in overdue client payments using 45-day MSME statutory claims.&rdquo;</div>
                  <div className="testi-row">
                    <div className="testi-av">VS</div>
                    <div>
                      <div className="testi-name">Vijay Kumar</div>
                      <div className="testi-role">Founder, HITECH Agency</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL (Kokonut Glossy Card) */}
        <div className={`R ${visible ? 'in' : ''}`}>
          {/* Language Switcher */}
          <div className="lang">
            <button className={!te ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={te ? 'on' : ''} onClick={() => setLang('te')}>తెలుగు</button>
          </div>

          <div className="rf">
            <div className="f-ey">Welcome to Settlr</div>
            <h2 className="f-h2">{te ? 'లాగిన్ అవ్వండి' : 'Sign in to dashboard'}</h2>
            <p className="f-desc">
              {te ? 'మీ బిజినెస్ ఇన్వాయిస్‌లు, AI కాంట్రాక్ట్‌లు & GST ఫైలింగ్ మేనేజ్ చేయండి.' : 'Manage your business invoices, AI contract analysis, and GST tax filing.'}
            </p>

            <div className="pills">
              <span className="pill"><span className="pill-dot" /> 💬 WhatsApp Reminders</span>
              <span className="pill"><span className="pill-dot" /> 🛡️ Contract Redlines</span>
              <span className="pill"><span className="pill-dot" /> 🧾 GSTR-1 JSON</span>
            </div>

            {/* Google OAuth Button */}
            <button className="g-btn" onClick={signInGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.3s.7 2.6 1.9 5l3.7-2.5z"/>
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
              </svg>
              <span className="g-label">{loading ? 'Connecting...' : 'Continue with Google'}</span>
              <span className="g-badge">Fast & Secure</span>
            </button>

            <div className="or">
              <div className="or-line" />
              <span className="or-text">or sign in with email</span>
              <div className="or-line" />
            </div>

            {error && <div className="err">⚠️ {error}</div>}

            {sent ? (
              <div className="sent-box">
                <span>✉️</span>
                <p>Login link sent to {email}! Check your inbox.</p>
              </div>
            ) : (
              <>
                <div className="inp-wrap">
                  <span className="inp-icon">📧</span>
                  <input
                    className="inp"
                    type="email"
                    placeholder="name@business.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && signInEmail()}
                  />
                </div>

                <button className="cta" onClick={signInEmail} disabled={loading}>
                  {loading ? 'Sending Magic Link...' : 'Send Magic Link →'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}