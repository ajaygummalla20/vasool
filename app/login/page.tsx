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
  { name: 'Infosys Project · INV-041', amount: '₹1,20,000', pct: 100, color: '#2D8A58', status: 'Paid · 3 days ago via UPI',       dot: '#2D8A58' },
  { name: 'Cyient Ltd · INV-042',      amount: '₹85,000',   pct: 60,  color: '#E8692A', status: 'Reminder sent · 12 days overdue', dot: '#E8692A' },
  { name: 'TCS Vendor · INV-043',      amount: '₹2,40,000', pct: 25,  color: '#888780', status: 'Invoice sent · Due in 18 days',    dot: '#888780' },
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
    const id = setTimeout(() => requestAnimationFrame(raf), 600)
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
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;0,700;1,600;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        /* ── ROOT ── */
        .vsl { height: 100vh; display: grid; grid-template-columns: 1fr 380px; font-family: 'DM Sans', sans-serif; overflow: hidden; }

        /* ─────────── LEFT PANEL ─────────── */
        .L {
          background: #0C1A10;
          display: flex; flex-direction: column;
          padding: 32px 40px;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(-16px);
          transition: opacity .55s ease, transform .55s ease;
        }
        .L.in { opacity: 1; transform: translateX(0); }

        /* ambient glow */
        .L::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 55% 40% at 8% 12%, rgba(45,138,88,.22) 0%, transparent 55%),
            radial-gradient(ellipse 40% 35% at 88% 88%, rgba(232,105,42,.13) 0%, transparent 55%);
        }

        /* subtle grid lines */
        .L::after {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .z { position: relative; z-index: 1; }

        /* logo */
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; flex-shrink: 0; }
        .logo-mark {
          width: 36px; height: 36px; border-radius: 9px;
          background: #2D8A58; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(45,138,88,.5), 0 4px 12px rgba(45,138,88,.25);
        }
        .logo-name { font-family: 'Lora', serif; font-size: 19px; font-weight: 700; color: #EEE9E2; letter-spacing: -.02em; line-height: 1; }
        .logo-sub  { font-size: 9px; color: rgba(238,233,226,.28); margin-top: 2px; }

        /* tag */
        .tag {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid rgba(45,138,88,.28); border-radius: 100px;
          padding: 3px 11px; font-size: 10px; font-weight: 500; color: #6DC49A;
          width: fit-content; margin-bottom: 14px; flex-shrink: 0;
          background: rgba(45,138,88,.08);
        }
        .tag-dot { width: 5px; height: 5px; border-radius: 50%; background: #2D8A58; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }

        /* headline */
        .h1 {
          font-family: 'Lora', serif;
          font-size: clamp(26px, 2.6vw, 38px);
          font-weight: 700; line-height: 1.1; letter-spacing: -.03em;
          color: #EEE9E2; margin-bottom: 8px; flex-shrink: 0;
        }
        .h1 em { font-style: italic; color: #E8692A; }
        .h1 .g { color: #2D8A58; }

        .desc {
          font-size: 12px; font-weight: 300; color: rgba(238,233,226,.45);
          line-height: 1.68; margin-bottom: 18px; flex-shrink: 0; max-width: 460px;
        }

        /* ── DASHBOARD PREVIEW ── */
        .preview-wrap {
          flex: 1; display: flex; flex-direction: column;
          min-height: 0; gap: 6px;
        }

        .preview-label {
          font-size: 9px; font-weight: 600; color: rgba(238,233,226,.28);
          text-transform: uppercase; letter-spacing: .10em; margin-bottom: 2px; flex-shrink: 0;
        }

        /* summary bar */
        .summary {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: rgba(238,233,226,.08);
          border-radius: 9px; overflow: hidden;
          border: .5px solid rgba(238,233,226,.08);
          flex-shrink: 0;
        }
        .summary-cell { background: rgba(238,233,226,.04); padding: 8px 10px; }
        .summary-n { font-size: 15px; font-weight: 600; color: #EEE9E2; line-height: 1; margin-bottom: 2px; }
        .summary-l { font-size: 8px; color: rgba(238,233,226,.32); }

        /* invoice rows — fill remaining space */
        .invoices { flex: 1; display: flex; flex-direction: column; gap: 5px; min-height: 0; }

        .inv {
          flex: 1;
          background: rgba(238,233,226,.04);
          border: .5px solid rgba(238,233,226,.08);
          border-radius: 9px; padding: 10px 12px;
          display: flex; flex-direction: column; justify-content: space-between;
          min-height: 0;
          transition: background .2s;
        }
        .inv:hover { background: rgba(238,233,226,.07); }

        .inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 7px; }
        .inv-name { font-size: 11px; font-weight: 500; color: rgba(238,233,226,.80); }
        .inv-amount { font-size: 12px; font-weight: 600; color: #EEE9E2; }
        .inv-track { height: 3px; background: rgba(238,233,226,.10); border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
        .inv-fill  { height: 100%; border-radius: 2px; transition: width .6s ease; }
        .inv-bottom { display: flex; align-items: center; gap: 5px; }
        .inv-dot   { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .inv-status { font-size: 9px; color: rgba(238,233,226,.38); }

        /* bottom 2 cols */
        .btm { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }

        .counter {
          background: rgba(238,233,226,.04);
          border: .5px solid rgba(238,233,226,.08);
          border-left: 2.5px solid #E8692A;
          border-radius: 9px; padding: 11px 13px;
        }
        .counter-lbl { font-size: 8px; font-weight: 500; color: rgba(238,233,226,.28); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
        .counter-num { font-family: 'Lora', serif; font-size: 22px; font-weight: 700; color: #EEE9E2; letter-spacing: -.02em; line-height: 1; margin-bottom: 3px; }
        .counter-sub { font-size: 8px; color: rgba(238,233,226,.30); }

        .testi {
          background: rgba(45,138,88,.10);
          border: .5px solid rgba(45,138,88,.22);
          border-radius: 9px; padding: 11px 13px;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .testi-q    { font-size: 9px; font-weight: 300; color: rgba(238,233,226,.72); line-height: 1.55; font-style: italic; margin-bottom: 8px; }
        .testi-row  { display: flex; align-items: center; gap: 6px; }
        .testi-av   { width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg,#E8692A,#C9951A); display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; color: white; flex-shrink: 0; }
        .testi-name { font-size: 9px; font-weight: 500; color: rgba(238,233,226,.80); }
        .testi-role { font-size: 8px; color: rgba(238,233,226,.35); margin-top: 1px; }

        /* ─────────── RIGHT PANEL ─────────── */
        .R {
          background: #FDFAF5;
          display: flex; flex-direction: column; justify-content: center;
          padding: 32px 28px;
          border-left: 1px solid rgba(26,20,13,.08);
          position: relative; overflow: hidden;
          opacity: 0; transform: translateX(16px);
          transition: opacity .55s .15s ease, transform .55s .15s ease;
        }
        .R.in { opacity: 1; transform: translateX(0); }

        /* gradient top bar */
        .R::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #2D8A58 0%, #E8692A 100%);
        }

        /* subtle bg pattern */
        .R::after {
          content: '';
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image: radial-gradient(rgba(26,20,13,.025) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .rf { position: relative; z-index: 1; }

        /* lang */
        .lang {
          position: absolute; top: 16px; right: 16px; z-index: 2;
          display: flex; gap: 2px;
          background: white; border: .5px solid rgba(26,20,13,.10);
          border-radius: 100px; padding: 3px;
        }
        .lang button {
          padding: 3px 10px; border-radius: 100px; border: none;
          font-size: 10px; font-weight: 500; cursor: pointer;
          transition: all .15s; font-family: 'DM Sans', sans-serif;
          background: transparent; color: rgba(26,20,13,.32);
        }
        .lang button.on { background: #1B5E3B; color: white; }

        /* form header */
        .f-ey   { font-size: 9px; font-weight: 600; color: #2D8A58; text-transform: uppercase; letter-spacing: .10em; margin-bottom: 6px; }
        .f-h2   { font-family: 'Lora', serif; font-size: 24px; font-weight: 700; color: #1A140D; letter-spacing: -.02em; line-height: 1.15; margin-bottom: 2px; }
        .f-sub  { font-size: 10px; color: rgba(26,20,13,.24); margin-bottom: 4px; }
        .f-desc { font-size: 12px; font-weight: 300; color: rgba(26,20,13,.50); line-height: 1.55; margin-bottom: 14px; }

        /* pills */
        .pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
        .pill  { display: flex; align-items: center; gap: 4px; background: white; border: .5px solid rgba(26,20,13,.09); border-radius: 100px; padding: 3px 8px; font-size: 9px; font-weight: 500; color: rgba(26,20,13,.48); }
        .pill-dot { width: 3px; height: 3px; border-radius: 50%; background: #2D8A58; }

        /* google */
        .g-btn {
          width: 100%; display: flex; align-items: center; gap: 9px;
          background: white; border: 1.5px solid rgba(26,20,13,.11);
          border-radius: 9px; padding: 10px 12px; cursor: pointer;
          transition: all .18s; margin-bottom: 10px;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 1px 4px rgba(26,20,13,.05);
        }
        .g-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(26,20,13,.09); border-color: rgba(26,20,13,.18); }
        .g-btn:disabled { opacity: .68; cursor: not-allowed; }
        .g-label { font-size: 12px; font-weight: 500; color: #1A140D; flex: 1; text-align: left; }
        .g-badge { font-size: 8px; font-weight: 600; background: rgba(45,138,88,.10); color: #1B5E3B; padding: 2px 7px; border-radius: 100px; }

        /* or */
        .or      { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
        .or-line { flex: 1; height: 1px; background: rgba(26,20,13,.08); }
        .or-text { font-size: 9px; color: rgba(26,20,13,.26); white-space: nowrap; }

        /* input */
        .inp-wrap { position: relative; margin-bottom: 7px; }
        .inp-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: rgba(26,20,13,.22); font-size: 12px; pointer-events: none; }
        .inp {
          width: 100%; background: white;
          border: 1.5px solid rgba(26,20,13,.10); border-radius: 9px;
          padding: 10px 11px 10px 32px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1A140D;
          transition: all .18s; outline: none;
        }
        .inp::placeholder { color: rgba(26,20,13,.26); }
        .inp:focus { border-color: #2D8A58; box-shadow: 0 0 0 3px rgba(45,138,88,.09); }

        /* cta */
        .cta {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
          background: linear-gradient(135deg, #1B5E3B 0%, #0D3B22 100%);
          border: none; border-radius: 9px; padding: 11px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: white;
          cursor: pointer; transition: all .18s; margin-bottom: 12px;
          box-shadow: 0 4px 12px rgba(27,94,59,.26);
        }
        .cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(27,94,59,.34); }
        .cta:disabled { opacity: .75; cursor: not-allowed; }

        /* sent */
        .sent-box {
          display: flex; align-items: center; gap: 8px;
          background: rgba(45,138,88,.07); border: 1px solid rgba(45,138,88,.18);
          border-radius: 9px; padding: 11px 12px; margin-bottom: 12px;
        }
        .sent-box p { font-size: 12px; font-weight: 500; color: #1B5E3B; }

        /* error */
        .err { font-size: 11px; color: #C0392B; margin-bottom: 6px; padding-left: 2px; }

        /* trust */
        .trust {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(45,138,88,.04); border: .5px solid rgba(45,138,88,.12);
          border-radius: 8px; padding: 9px 11px; margin-bottom: 10px;
        }
        .trust p { font-size: 10px; color: rgba(26,20,13,.46); line-height: 1.5; }
        .trust strong { color: #1B5E3B; font-weight: 600; }

        /* terms */
        .terms { font-size: 9px; color: rgba(26,20,13,.24); text-align: center; line-height: 1.6; }
        .terms a { color: rgba(26,20,13,.40); text-decoration: underline; cursor: pointer; }

        /* mobile */
        @media (max-width: 820px) {
          .vsl { grid-template-columns: 1fr; }
          .L    { display: none; }
          html, body { overflow: auto; }
        }
      `}</style>

      <div className="vsl">

        {/* ══════════ LEFT ══════════ */}
        <div className={`L ${visible ? 'in' : ''}`}>
          <div className="z" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

            {/* Logo */}
            <div className="logo">
              <div className="logo-mark">
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                  <path d="M4 11h14M4 7h9M4 15h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="logo-name">Vasool</div>
                <div className="logo-sub">వసూల్ — Get what you&apos;re owed</div>
              </div>
            </div>

            {/* Tag */}
            <div className="tag" style={{ marginBottom: 12 }}>
              <span className="tag-dot" />
              {te ? 'Telugu MSMEs కోసం' : 'Built for Telugu MSMEs & Freelancers'}
            </div>

            {/* Headline */}
            <h1 className="h1">
              {te ? 'ఆపు చేయటం ఆపు.' : 'Stop chasing.'}<br />
              <em>{te ? 'వసూల్ చేసుకో' : 'Start collecting'}</em><br />
              <span className="g">{te ? 'automatic గా.' : 'automatically.'}</span>
            </h1>

            <p className="desc">
              {te
                ? 'AI మీ contracts చదివి, GST invoices పంపి, WhatsApp reminders automatic గా పంపుతుంది — zero manual work.'
                : 'AI reads your contracts, generates GST invoices, and sends WhatsApp payment reminders — zero manual work.'}
            </p>

            {/* Dashboard Preview */}
            <div className="preview-wrap">
              <p className="preview-label">Your dashboard — live preview</p>

              {/* Summary bar */}
              <div className="summary">
                {[
                  { n: '₹4.45L', l: 'Total receivables' },
                  { n: '₹85K',   l: 'Overdue now' },
                  { n: '3',      l: 'Active invoices' },
                ].map(s => (
                  <div className="summary-cell" key={s.l}>
                    <div className="summary-n">{s.n}</div>
                    <div className="summary-l">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Invoice rows */}
              <div className="invoices">
                {INVOICES.map(inv => (
                  <div className="inv" key={inv.name}>
                    <div className="inv-top">
                      <span className="inv-name">{inv.name}</span>
                      <span className="inv-amount">{inv.amount}</span>
                    </div>
                    <div className="inv-track">
                      <div className="inv-fill" style={{ width: `${inv.pct}%`, background: inv.color }} />
                    </div>
                    <div className="inv-bottom">
                      <span className="inv-dot" style={{ background: inv.dot }} />
                      <span className="inv-status">{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: counter + testimonial */}
            <div className="btm" style={{ marginTop: 8 }}>
              <div className="counter">
                <div className="counter-lbl">Avg recovered / year</div>
                <div className="counter-num">{fmt(count)}</div>
                <div className="counter-sub">per user · Hyderabad</div>
              </div>
              <div className="testi">
                <p className="testi-q">
                  &ldquo;₹1.8L vasool chesukunnanu in 3 months. Automatic ga vastunnai!&rdquo;
                </p>
                <div className="testi-row">
                  <div className="testi-av">RK</div>
                  <div>
                    <div className="testi-name">Ravi Kumar</div>
                    <div className="testi-role">IT Freelancer, Hyd</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ══════════ RIGHT ══════════ */}
        <div className={`R ${visible ? 'in' : ''}`}>

          {/* Lang toggle */}
          <div className="lang">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'te' ? 'on' : ''} onClick={() => setLang('te')}>తె</button>
          </div>

          <div className="rf">
            <p className="f-ey">{te ? 'ఉచితం · Credit card అక్కరలేదు' : 'Free to start · No credit card'}</p>
            <h2 className="f-h2">{te ? 'వసూల్ కి స్వాగతం' : <>Welcome to<br />Vasool</>}</h2>
            <p className="f-sub">{te ? 'లాగిన్ అవ్వండి' : 'Sign in to get started'}</p>
            <p className="f-desc">{te ? '200+ Telugu MSMEs వేగంగా payment తీసుకుంటున్నారు.' : 'Join 200+ Telugu MSMEs already getting paid faster.'}</p>

            <div className="pills">
              {['GST Invoices', 'WhatsApp Chase', 'AI Contracts', 'UPI Payments'].map(f => (
                <div className="pill" key={f}><span className="pill-dot" />{f}</div>
              ))}
            </div>

            {/* Google */}
            <button className="g-btn" onClick={signInGoogle} disabled={loading}>
              <svg width="15" height="15" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              <span className="g-label">{loading ? 'Redirecting...' : (te ? 'Google తో continue చేయండి' : 'Continue with Google')}</span>
              <span className="g-badge">Recommended</span>
            </button>

            {/* Or */}
            <div className="or">
              <div className="or-line" /><span className="or-text">{te ? 'లేదా email తో' : 'or with email'}</span><div className="or-line" />
            </div>

            {/* Email / sent */}
            {!sent ? (
              <>
                <div className="inp-wrap">
                  <span className="inp-icon">✉</span>
                  <input
                    className="inp" type="email" value={email}
                    placeholder={te ? 'మీ email చెప్పండి' : 'your@email.com'}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    onKeyDown={e => e.key === 'Enter' && signInEmail()}
                  />
                </div>
                {error && <p className="err">{error}</p>}
                <button className="cta" onClick={signInEmail} disabled={loading}>
                  {loading ? 'Sending...' : (te ? 'Magic link పంపండి' : 'Send magic link')}
                  {!loading && <span style={{ fontSize: 15 }}>→</span>}
                </button>
              </>
            ) : (
              <div className="sent-box">
                <span style={{ fontSize: 18, flexShrink: 0 }}>📧</span>
                <p>{te ? '✓ Email చెక్ చేయండి! Magic link పంపాము.' : '✓ Check your email — magic link sent!'}</p>
              </div>
            )}

            {/* Trust */}
            <div className="trust">
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🔒</span>
              <p>
                <strong>Your data stays yours. </strong>
                {te ? 'మీ data external servers లో store చేయము.' : 'Never stored on external servers. On-device processing only.'}
              </p>
            </div>

            <p className="terms">
              By signing in you agree to our{' '}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.<br />
              Vasool — DPIIT Recognised Startup.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}