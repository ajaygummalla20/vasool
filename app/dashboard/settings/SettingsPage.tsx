 'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface Profile {
  full_name:         string
  business_name:     string
  phone:             string
  whatsapp:          string
  gst_number:        string
  pan_number:        string
  address:           string
  city:              string
  state:             string
  pincode:           string
  invoice_prefix:    string
  invoice_counter:   number
  upi_id:            string
  bank_name:         string
  bank_account:      string
  bank_ifsc:         string
  msme_udyam_number: string
}

const STATES = [
  'Andhra Pradesh','Telangana','Karnataka','Tamil Nadu','Maharashtra',
  'Delhi','Uttar Pradesh','Gujarat','Rajasthan','West Bengal',
  'Madhya Pradesh','Kerala','Punjab','Haryana','Bihar','Other',
]

const EMPTY: Profile = {
  full_name:'', business_name:'', phone:'', whatsapp:'',
  gst_number:'', pan_number:'', address:'', city:'',
  state:'Andhra Pradesh', pincode:'', invoice_prefix:'INV', invoice_counter:1,
  upi_id:'', bank_name:'', bank_account:'', bank_ifsc:'', msme_udyam_number:'',
}

interface Props {
  initialTab?: 'profile' | 'business' | 'payments' | 'invoice'
}

export default function SettingsPage({ initialTab = 'profile' }: Props) {
  const [profile,    setProfile]    = useState<Profile>(EMPTY)
  const [email,      setEmail]      = useState('')
  const [userName,   setUserName]   = useState('')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [activeTab,  setActiveTab]  = useState<'profile'|'business'|'payments'|'invoice'>(initialTab)

  useEffect(() => {
    const load = async () => {
      const sb = getSupabase()
      const { data: authData } = await sb.auth.getUser()
      const user = authData?.user
      if (!user) { window.location.href = '/login'; return }

      setEmail(user.email || '')

      const { data: profileData } = await sb
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile({
          full_name:         profileData.full_name         || '',
          business_name:     profileData.business_name     || '',
          phone:             profileData.phone             || '',
          whatsapp:          profileData.whatsapp          || '',
          gst_number:        profileData.gst_number        || '',
          pan_number:        profileData.pan_number        || '',
          address:           profileData.address           || '',
          city:              profileData.city              || '',
          state:             profileData.state             || 'Andhra Pradesh',
          pincode:           profileData.pincode           || '',
          invoice_prefix:    profileData.invoice_prefix    || 'INV',
          invoice_counter:   profileData.invoice_counter   || 1,
          upi_id:            profileData.upi_id            || '',
          bank_name:         profileData.bank_name         || '',
          bank_account:      profileData.bank_account      || '',
          bank_ifsc:         profileData.bank_ifsc         || '',
          msme_udyam_number: profileData.msme_udyam_number || '',
        })
        setUserName(profileData.full_name || user.email?.split('@')[0] || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const set = (field: keyof Profile, value: string | number) =>
    setProfile(p => ({ ...p, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const sb = getSupabase()
      const { data } = await sb.auth.getUser()
      const user = data?.user
      if (!user) return

      const { error } = await sb.from('profiles').upsert({
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (error) throw error
      setUserName(profile.full_name || email.split('@')[0])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      console.error(e)
      alert('Error saving profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const initials = userName
    .split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'

  const tabs = [
    { id: 'profile'  as const, label: 'Personal',       icon: '👤' },
    { id: 'business' as const, label: 'Business & GST',  icon: '🏢' },
    { id: 'payments' as const, label: 'UPI & Bank Wire', icon: '💳' },
    { id: 'invoice'  as const, label: 'Invoicing',       icon: '🧾' },
  ]

  if (loading) {
    return (
      <div style={{ display:'flex', minHeight:'100vh' }}>
        <Sidebar userName={userName} userEmail={email} />
        <div style={{ flex:1, marginLeft:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontSize:13, color:'rgba(26,20,13,.40)', fontFamily:'DM Sans,sans-serif' }}>Loading profile…</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .s-root{display:flex;min-height:100vh}
        .s-main{flex:1;margin-left:200px;display:flex;flex-direction:column;min-height:100vh}

        /* topbar */
        .s-top{background:#FDFAF5;border-bottom:1px solid rgba(26,20,13,.10);padding:0 28px;height:56px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;box-shadow:0 1px 0 rgba(26,20,13,.05);position:sticky;top:0;z-index:40}
        .s-top-title{font-family:'Lora',serif;font-size:16px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .s-top-sub{font-size:10px;color:rgba(26,20,13,.38);margin-top:1px}
        .s-save-btn{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(27,94,59,.28);transition:all .18s}
        .s-save-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 14px rgba(27,94,59,.36)}
        .s-save-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
        .s-saved-badge{display:flex;align-items:center;gap:6px;background:rgba(27,94,59,.10);border:1px solid rgba(27,94,59,.22);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:500;color:#1B5E3B}

        /* body */
        .s-body{flex:1;display:grid;grid-template-columns:240px 1fr;gap:0;overflow:hidden;height:calc(100vh - 56px)}

        /* left nav */
        .s-nav{background:#FDFAF5;border-right:1px solid rgba(26,20,13,.08);padding:24px 16px;display:flex;flex-direction:column;gap:4px;overflow-y:auto}

        /* avatar */
        .s-av-wrap{display:flex;flex-direction:column;align-items:center;padding:20px 0 24px;border-bottom:1px solid rgba(26,20,13,.07);margin-bottom:16px}
        .s-av{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#1B5E3B,#0D3B22);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:white;margin-bottom:10px;box-shadow:0 4px 16px rgba(27,94,59,.25);font-family:'Lora',serif}
        .s-av-name{font-size:14px;font-weight:600;color:#1A140D;letter-spacing:-.01em;margin-bottom:2px;text-align:center}
        .s-av-email{font-size:10px;color:rgba(26,20,13,.40);text-align:center;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

        .s-nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;cursor:pointer;transition:all .15s;border:none;background:transparent;width:100%;text-align:left;font-family:'DM Sans',sans-serif}
        .s-nav-item:hover{background:rgba(26,20,13,.05)}
        .s-nav-item.on{background:rgba(27,94,59,.10);border:1px solid rgba(27,94,59,.18)}
        .s-nav-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .s-nav-label{font-size:12px;font-weight:500;color:rgba(26,20,13,.55)}
        .s-nav-item.on .s-nav-label{color:#1A140D;font-weight:600}
        .s-nav-item.on .s-nav-icon{background:rgba(27,94,59,.15)}

        /* completion dots */
        .s-nav-dot{width:6px;height:6px;border-radius:50%;margin-left:auto;flex-shrink:0}

        /* right content */
        .s-content{overflow-y:auto;padding:28px 32px;background:#F0EDE8}

        /* section header */
        .s-sec-title{font-family:'Lora',serif;font-size:18px;font-weight:700;color:#1A140D;letter-spacing:-.02em;margin-bottom:4px}
        .s-sec-sub{font-size:12px;color:rgba(26,20,13,.45);margin-bottom:24px;line-height:1.5}

        /* cards */
        .s-card{background:white;border:1px solid rgba(26,20,13,.08);border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(26,20,13,.04);margin-bottom:14px}
        .s-card-hdr{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid rgba(26,20,13,.06)}
        .s-card-icon{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
        .s-card-title{font-size:13px;font-weight:600;color:#1A140D}
        .s-card-sub{font-size:10px;color:rgba(26,20,13,.40);margin-top:1px}
        .s-card-body{padding:18px}

        /* grid */
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .s2{grid-column:span 2}

        /* fields */
        .lb{font-size:9px;font-weight:600;color:rgba(26,20,13,.48);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}
        .opt{font-size:9px;font-weight:400;color:rgba(26,20,13,.28);text-transform:none;letter-spacing:0;margin-left:4px}

        .in{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.11);border-radius:9px;padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;transition:all .18s;display:block}
        .in::placeholder{color:rgba(26,20,13,.28)}
        .in:focus{background:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.10)}
        .in[disabled]{background:#EDEAE5;color:rgba(26,20,13,.45);cursor:not-allowed}

        .sl{width:100%;background:#F7F5F0;border:1.5px solid rgba(26,20,13,.11);border-radius:9px;padding:10px 32px 10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231A140D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;transition:all .18s;display:block}
        .sl:focus{background-color:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.10)}

        /* invoice preview badge */
        .inv-preview{background:linear-gradient(135deg,#0C1A10,#0F2116);border-radius:12px;padding:20px;margin-top:4px}
        .inv-preview-label{font-size:9px;font-weight:600;color:rgba(238,233,226,.30);text-transform:uppercase;letter-spacing:.10em;margin-bottom:10px}
        .inv-preview-num{font-family:'Lora',serif;font-size:28px;font-weight:700;color:#EEE9E2;letter-spacing:-.02em;margin-bottom:4px}
        .inv-preview-series{font-size:11px;color:rgba(238,233,226,.40)}
        .inv-preview-examples{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
        .inv-preview-ex{background:rgba(238,233,226,.07);border:.5px solid rgba(238,233,226,.12);border-radius:6px;padding:4px 10px;font-size:10px;color:rgba(238,233,226,.50)}

        /* completion bar */
        .s-completion{background:white;border:1px solid rgba(26,20,13,.08);border-radius:12px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px}
        .s-comp-bar-wrap{flex:1;height:6px;background:rgba(26,20,13,.08);border-radius:3px;overflow:hidden}
        .s-comp-bar{height:100%;border-radius:3px;background:linear-gradient(90deg,#1B5E3B,#2D8A58);transition:width .4s ease}
        .s-comp-pct{font-size:13px;font-weight:600;color:#1B5E3B;min-width:36px;text-align:right}
        .s-comp-label{font-size:11px;color:rgba(26,20,13,.45)}

        /* toast */
        .s-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1B5E3B,#0D3B22);color:white;padding:12px 22px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 8px 28px rgba(27,94,59,.45);z-index:200;animation:su .3s ease}
        @keyframes su{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        @media(max-width:900px){
          .s-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .s-top{padding:12px 16px; flex-wrap:wrap; height:auto; gap:10px}
          .s-body{grid-template-columns:1fr; padding:16px; gap:16px}
          .s-nav{
            display:flex; flex-direction:row; overflow-x:auto; padding:4px;
            background:white; border-radius:12px; border:1px solid rgba(26,20,13,.08);
            gap:4px; width:100%; -webkit-overflow-scrolling:touch;
          }
          .s-av-wrap{display:none}
          .s-nav-item{flex:1; min-width:100px; padding:8px 10px; justify-content:center; white-space:nowrap}
          .s-card-body{padding:16px}
          .g2{grid-template-columns:1fr}
        }
      `}</style>

      <div className="s-root">
        <Sidebar userName={userName} userEmail={email} />
        <div className="s-main">

          {/* Topbar */}
          <div className="s-top">
            <div>
              <div className="s-top-title">Profile & Settings</div>
              <div className="s-top-sub">Manage your business details and invoice preferences</div>
            </div>
            {saved ? (
              <div className="s-saved-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Changes saved
              </div>
            ) : (
              <button className="s-save-btn" onClick={handleSave} disabled={saving}>
                {saving
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{animation:'spin 1s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                }
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>

          <div className="s-body">
            {/* Left nav */}
            <div className="s-nav">
              <div className="s-av-wrap">
                <div className="s-av">{initials}</div>
                <div className="s-av-name">{profile.full_name || 'Your Name'}</div>
                <div className="s-av-email">{email}</div>
              </div>

              {tabs.map(tab => {
                const filled =
                  tab.id === 'profile'  ? !!(profile.full_name && profile.phone) :
                  tab.id === 'business' ? !!(profile.business_name && profile.gst_number) :
                  tab.id === 'payments' ? !!(profile.upi_id || profile.bank_account) :
                  !!(profile.invoice_prefix)
                return (
                  <button
                    key={tab.id}
                    className={`s-nav-item ${activeTab === tab.id ? 'on' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div className="s-nav-icon">{tab.icon}</div>
                    <span className="s-nav-label">{tab.label}</span>
                    <div className="s-nav-dot" style={{background: filled ? '#1B5E3B' : 'rgba(26,20,13,.15)'}}/>
                  </button>
                )
              })}
            </div>

            {/* Right content */}
            <div className="s-content">

              {/* Profile completion */}
              {(() => {
                const fields = [profile.full_name, profile.business_name, profile.phone, profile.gst_number, profile.upi_id || profile.bank_account, profile.address]
                const filled = fields.filter(Boolean).length
                const pct = Math.round((filled / fields.length) * 100)
                return (
                  <div className="s-completion">
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:'#1A140D',marginBottom:2}}>Profile completion</div>
                      <div className="s-comp-label">{pct < 100 ? `${fields.length - filled} fields left to complete` : 'Profile fully complete ✓'}</div>
                    </div>
                    <div className="s-comp-bar-wrap">
                      <div className="s-comp-bar" style={{width:`${pct}%`}}/>
                    </div>
                    <div className="s-comp-pct">{pct}%</div>
                  </div>
                )
              })()}

              {/* ── PERSONAL TAB ── */}
              {activeTab === 'profile' && (
                <>
                  <div className="s-sec-title">Personal details</div>
                  <div className="s-sec-sub">Your name and contact information — shown on invoice PDFs</div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(27,94,59,.10)'}}>👤</div>
                      <div>
                        <div className="s-card-title">Your name</div>
                        <div className="s-card-sub">Appears as the sender on all invoices</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div>
                          <div className="lb">Full name</div>
                          <input className="in" value={profile.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Ajay Kumar Gummalla"/>
                        </div>
                        <div>
                          <div className="lb">Email address</div>
                          <input className="in" value={email} disabled placeholder="your@email.com"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(24,95,165,.10)'}}>📱</div>
                      <div>
                        <div className="s-card-title">Contact numbers</div>
                        <div className="s-card-sub">Used for client communication</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div>
                          <div className="lb">Mobile number</div>
                          <input className="in" value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="98765 43210"/>
                        </div>
                        <div>
                          <div className="lb">WhatsApp <span className="opt">if different</span></div>
                          <input className="in" value={profile.whatsapp} onChange={e => set('whatsapp', e.target.value)} placeholder="Same as mobile if blank"/>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(133,79,11,.10)'}}>📍</div>
                      <div>
                        <div className="s-card-title">Your address</div>
                        <div className="s-card-sub">Printed on invoice PDF as sender address</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div className="s2">
                          <div className="lb">Street address <span className="opt">optional</span></div>
                          <input className="in" value={profile.address} onChange={e => set('address', e.target.value)} placeholder="Flat 4B, Hitech City, Madhapur"/>
                        </div>
                        <div>
                          <div className="lb">City</div>
                          <input className="in" value={profile.city} onChange={e => set('city', e.target.value)} placeholder="Hyderabad"/>
                        </div>
                        <div>
                          <div className="lb">State</div>
                          <select className="sl" value={profile.state} onChange={e => set('state', e.target.value)}>
                            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <div className="lb">Pincode <span className="opt">optional</span></div>
                          <input className="in" value={profile.pincode} onChange={e => set('pincode', e.target.value)} placeholder="500081" maxLength={6}/>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── BUSINESS TAB ── */}
              {activeTab === 'business' && (
                <>
                  <div className="s-sec-title">Business details</div>
                  <div className="s-sec-sub">Business registration and tax information — required for GST invoices</div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(27,94,59,.10)'}}>🏢</div>
                      <div>
                        <div className="s-card-title">Business identity</div>
                        <div className="s-card-sub">Appears on invoice header</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div>
                          <div className="lb">Business / company name</div>
                          <input className="in" value={profile.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Settlr Technologies LLP"/>
                        </div>
                        <div>
                          <div className="lb">PAN number <span className="opt">optional</span></div>
                          <input className="in" value={profile.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="AABCV1234D" maxLength={10}/>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(124,58,237,.10)'}}>🧮</div>
                      <div>
                        <div className="s-card-title">GST registration</div>
                        <div className="s-card-sub">Required for GST-compliant invoices</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div>
                          <div className="lb">GST number</div>
                          <input className="in" value={profile.gst_number} onChange={e => set('gst_number', e.target.value.toUpperCase())} placeholder="36AABCV1234D1Z5" maxLength={15}/>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
                          {profile.gst_number.length === 15 ? (
                            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(27,94,59,.08)',border:'1px solid rgba(27,94,59,.20)',borderRadius:8,padding:'10px 12px'}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B5E3B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                              <span style={{fontSize:12,fontWeight:500,color:'#1B5E3B'}}>GST format looks correct</span>
                            </div>
                          ) : profile.gst_number.length > 0 ? (
                            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(232,105,42,.06)',border:'1px solid rgba(232,105,42,.20)',borderRadius:8,padding:'10px 12px'}}>
                              <span style={{fontSize:12,color:'#C85A1A'}}>GST must be 15 characters (currently {profile.gst_number.length})</span>
                            </div>
                          ) : (
                            <div style={{fontSize:11,color:'rgba(26,20,13,.38)',padding:'4px 0',lineHeight:1.5}}>Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit + Z + 1 digit/letter</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MSME Udyam Registration (MSMED Act 2006) */}
                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(59,130,246,.12)'}}>🛡️</div>
                      <div>
                        <div className="s-card-title">MSME / Udyam Registration (MSMED Act 2006)</div>
                        <div className="s-card-sub">Enables 45-day statutory payment enforcement & 3x RBI bank rate interest claims</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div className="s2">
                          <div className="lb">Udyam Registration Number (URN) <span className="opt">Optional but recommended</span></div>
                          <input className="in" value={profile.msme_udyam_number || ''} onChange={e => set('msme_udyam_number', e.target.value.toUpperCase())} placeholder="UDYAM-TS-01-0012345"/>
                          <div style={{fontSize:10,color:'rgba(26,20,13,.4)',marginTop:4}}>Printed on invoice footers to legally invoke Section 15 of MSMED Act 2006 for 45-day payment caps</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── PAYMENTS & BANK TAB ── */}
              {activeTab === 'payments' && (
                <>
                  <div className="s-sec-title">UPI & Bank Account Details</div>
                  <div className="s-sec-sub">Configure your remittance accounts — printed on invoice PDFs and used to generate dynamic NPCI scan-to-pay QR codes</div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(16,185,129,.12)'}}>📱</div>
                      <div>
                        <div className="s-card-title">Dynamic UPI ID (Google Pay / PhonePe / Paytm)</div>
                        <div className="s-card-sub">Generates dynamic scan-to-pay QR codes with invoice amount and notes auto-filled</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div className="s2">
                          <div className="lb">Primary UPI VPA ID <span className="opt">e.g. yourname@okaxis, 9876543210@paytm</span></div>
                          <input
                            className="in"
                            value={profile.upi_id || ''}
                            onChange={e => set('upi_id', e.target.value.trim())}
                            placeholder="username@okhdfcbank"
                          />
                          <div style={{fontSize:10,color:'rgba(26,20,13,.4)',marginTop:4}}>
                            Clients can scan your invoice QR code directly via GPay, PhonePe, Paytm, or BHIM.
                          </div>
                        </div>
                      </div>

                      {profile.upi_id && (
                        <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(27,94,59,.06)', border: '1px solid rgba(27,94,59,.15)', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&margin=4&data=${encodeURIComponent(`upi://pay?pa=${profile.upi_id}&pn=${encodeURIComponent(profile.business_name || profile.full_name || 'Business')}&cu=INR`)}`}
                            alt="Sample QR"
                            style={{ width: 60, height: 60, borderRadius: 6, background: 'white', border: '1px solid rgba(0,0,0,.1)' }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1B5E3B' }}>✓ Dynamic QR Code Enabled</div>
                            <div style={{ fontSize: 10, color: 'rgba(26,20,13,.6)', marginTop: 2 }}>
                              Every new invoice will automatically display a customized scan-to-pay QR code linked to <strong>{profile.upi_id}</strong>.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(24,95,165,.10)'}}>🏦</div>
                      <div>
                        <div className="s-card-title">Bank Wire Details (NEFT / RTGS / IMPS)</div>
                        <div className="s-card-sub">Printed on invoice PDFs for client direct bank transfers</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2">
                        <div>
                          <div className="lb">Bank Name</div>
                          <input className="in" value={profile.bank_name || ''} onChange={e => set('bank_name', e.target.value)} placeholder="HDFC Bank / ICICI Bank / SBI"/>
                        </div>
                        <div>
                          <div className="lb">Account Number</div>
                          <input className="in" value={profile.bank_account || ''} onChange={e => set('bank_account', e.target.value)} placeholder="50100234567890"/>
                        </div>
                        <div>
                          <div className="lb">IFSC Code</div>
                          <input className="in" value={profile.bank_ifsc || ''} onChange={e => set('bank_ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234"/>
                        </div>
                        <div>
                          <div className="lb">Beneficiary / Account Holder Name</div>
                          <input className="in" value={profile.business_name || profile.full_name || ''} readOnly placeholder="Same as business name"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── INVOICE TAB ── */}
              {activeTab === 'invoice' && (
                <>
                  <div className="s-sec-title">Invoice preferences</div>
                  <div className="s-sec-sub">Customise your invoice numbering format and series</div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(232,105,42,.10)'}}>🔢</div>
                      <div>
                        <div className="s-card-title">Invoice numbering</div>
                        <div className="s-card-sub">Prefix + sequential number — e.g. INV-001, INV-002…</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div className="g2" style={{marginBottom:20}}>
                        <div>
                          <div className="lb">Invoice prefix</div>
                          <input
                            className="in"
                            value={profile.invoice_prefix}
                            onChange={e => set('invoice_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
                            placeholder="INV"
                            maxLength={6}
                          />
                          <div style={{fontSize:10,color:'rgba(26,20,13,.38)',marginTop:4}}>Letters and numbers only, max 6 chars</div>
                        </div>
                        <div>
                          <div className="lb">Next invoice number</div>
                          <input
                            className="in"
                            type="number"
                            min={1}
                            value={profile.invoice_counter}
                            onChange={e => set('invoice_counter', parseInt(e.target.value) || 1)}
                          />
                          <div style={{fontSize:10,color:'rgba(26,20,13,.38)',marginTop:4}}>
                            Next invoice will be: <strong>{profile.invoice_prefix || 'INV'}-{String(profile.invoice_counter).padStart(3,'0')}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Live preview */}
                      <div className="inv-preview">
                        <div className="inv-preview-label">Live preview</div>
                        <div className="inv-preview-num">
                          {profile.invoice_prefix || 'INV'}-{String(profile.invoice_counter).padStart(3,'0')}
                        </div>
                        <div className="inv-preview-series">
                          Your invoices will be numbered: {profile.invoice_prefix || 'INV'}-{String(profile.invoice_counter).padStart(3,'0')}, {profile.invoice_prefix || 'INV'}-{String(profile.invoice_counter + 1).padStart(3,'0')}, {profile.invoice_prefix || 'INV'}-{String(profile.invoice_counter + 2).padStart(3,'0')}…
                        </div>
                        <div className="inv-preview-examples">
                          {['INV','VSSL','YOUR','2024','VS'].map(ex => (
                            <div key={ex} className="inv-preview-ex">{ex}-001</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="s-card">
                    <div className="s-card-hdr">
                      <div className="s-card-icon" style={{background:'rgba(27,94,59,.10)'}}>💡</div>
                      <div>
                        <div className="s-card-title">Tip — complete your profile first</div>
                        <div className="s-card-sub">Your business name and GST appear on every invoice PDF</div>
                      </div>
                    </div>
                    <div className="s-card-body">
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {[
                          { label:'Full name',      val:profile.full_name,      tab:'profile'  as const },
                          { label:'Business name',  val:profile.business_name,  tab:'business' as const },
                          { label:'GST number',     val:profile.gst_number,     tab:'business' as const },
                          { label:'Mobile number',  val:profile.phone,          tab:'profile'  as const },
                        ].map(item => (
                          <div key={item.label} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:item.val?'rgba(27,94,59,.05)':'rgba(232,105,42,.05)',border:`1px solid ${item.val?'rgba(27,94,59,.15)':'rgba(232,105,42,.15)'}`,borderRadius:8}}>
                            <div style={{width:16,height:16,borderRadius:'50%',background:item.val?'#1B5E3B':'rgba(232,105,42,.30)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                              {item.val
                                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M12 8v4M12 16h.01"/></svg>
                              }
                            </div>
                            <span style={{fontSize:12,fontWeight:500,color:item.val?'#1B5E3B':'#C85A1A',flex:1}}>{item.label}</span>
                            {!item.val && (
                              <button onClick={() => setActiveTab(item.tab)} style={{fontSize:10,color:'#C85A1A',background:'none',border:'none',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500}}>
                                Fill now →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {saved && (
        <div className="s-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          Profile saved successfully!
        </div>
      )}
    </>
  )
}