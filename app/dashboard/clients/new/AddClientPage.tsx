'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Sidebar from '@/components/Sidebar'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface FormData {
  name: string; company_name: string; email: string; phone: string
  whatsapp: string; gst_number: string; address: string
  city: string; state: string; pincode: string; notes: string
}

interface Reminders { day7: boolean; day14: boolean; day30: boolean }

const STATES = [
  'Andhra Pradesh','Telangana','Karnataka','Tamil Nadu','Maharashtra',
  'Delhi','Uttar Pradesh','Gujarat','Rajasthan','West Bengal',
  'Madhya Pradesh','Kerala','Punjab','Haryana','Bihar','Other',
]

const FLOW = [
  { n:'1', bg:'#1B5E3B', ring:'rgba(27,94,59,.25)', title:'Invoice sent',      sub:'GST invoice + UPI payment link via email & WhatsApp', time:'Day 0',          tc:'#2D8A58' },
  { n:'2', bg:'#185FA5', ring:'rgba(24,95,165,.25)', title:'Polite reminder',   sub:'"Hi, just a gentle reminder about Invoice #XX"',         time:'Day 7 overdue',  tc:'#185FA5' },
  { n:'3', bg:'#C85A1A', ring:'rgba(200,90,26,.25)', title:'Follow-up + PDF',   sub:'Second WhatsApp with invoice PDF re-attached',            time:'Day 14 overdue', tc:'#C85A1A' },
  { n:'4', bg:'#7C3AED', ring:'rgba(124,58,237,.25)', title:'Firm reminder',    sub:'AI quotes the late fee clause from the signed contract',   time:'Day 30 overdue', tc:'#7C3AED' },
  { n:'✓', bg:'#059669', ring:'rgba(5,150,105,.25)',  title:'Payment received', sub:'UPI detected → all reminders stop → invoice marked paid', time:'Auto-detected',  tc:'#059669' },
]

export default function AddClientPage({ userName = '', userEmail = '' }: { userName?: string; userEmail?: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    name:'', company_name:'', email:'', phone:'',
    whatsapp:'', gst_number:'', address:'',
    city:'', state:'Andhra Pradesh', pincode:'', notes:'',
  })
  const [reminders, setReminders] = useState<Reminders>({ day7:true, day14:true, day30:true })
  const [loading, setLoading] = useState(false)
  const [errors,  setErrors]  = useState<Partial<FormData>>({})
  const [saved,   setSaved]   = useState(false)

  const set = (f: keyof FormData, v: string) => {
    setForm(p => ({ ...p, [f]: v }))
    setErrors(p => ({ ...p, [f]: '' }))
  }

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.name.trim()) e.name = 'Client name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g,''))) e.phone = 'Enter a valid 10-digit number'
    if (form.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gst_number)) e.gst_number = 'Invalid GST number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { error } = await supabase.from('clients').insert({
        user_id: user.id,
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || form.phone.trim() || null,
        gst_number: form.gst_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        pincode: form.pincode.trim() || null,
        notes: form.notes.trim() || null,
      })
      if (error) throw error
      setSaved(true)
      setTimeout(() => router.push('/dashboard/clients'), 1400)
    } catch (e: unknown) {
      console.error(e)
      alert('Error saving client. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;font-family:'DM Sans',sans-serif;background:#F0EDE8}

        .root{display:flex;min-height:100vh}
        .main{flex:1;margin-left:200px;display:flex;flex-direction:column;height:100vh;overflow:hidden}

        /* ── TOPBAR ── */
        .top{
          background:#FDFAF5;
          border-bottom:1px solid rgba(26,20,13,.10);
          padding:0 24px;height:56px;
          display:flex;align-items:center;justify-content:space-between;
          flex-shrink:0;position:sticky;top:0;z-index:40;
          box-shadow:0 1px 0 rgba(26,20,13,.06);
        }
        .top-l{display:flex;align-items:center;gap:12px}
        .back{display:flex;align-items:center;gap:5px;font-size:12px;color:rgba(26,20,13,.42);cursor:pointer;background:none;border:none;font-family:'DM Sans',sans-serif;transition:color .15s}
        .back:hover{color:#1A140D}
        .vdiv{width:1px;height:18px;background:rgba(26,20,13,.10)}
        .top-title{font-family:'Lora',serif;font-size:15px;font-weight:700;color:#1A140D;letter-spacing:-.02em}
        .top-sub{font-size:10px;color:rgba(26,20,13,.38);margin-top:1px}
        .top-btns{display:flex;gap:8px;align-items:center}
        .btn-cancel{background:white;border:1px solid rgba(26,20,13,.12);border-radius:8px;padding:7px 14px;font-size:12px;font-weight:500;color:rgba(26,20,13,.55);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .15s}
        .btn-cancel:hover{border-color:rgba(26,20,13,.22);color:#1A140D}
        .btn-save{background:linear-gradient(135deg,#1B5E3B,#0D3B22);border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:600;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(27,94,59,.35),0 1px 2px rgba(27,94,59,.2);transition:all .18s}
        .btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(27,94,59,.40)}
        .btn-save:disabled{opacity:.70;cursor:not-allowed;transform:none}

        /* ── BODY ── */
        .body{flex:1;display:grid;grid-template-columns:1fr 320px;overflow:hidden}

        /* ── LEFT ── */
        .form-col{overflow-y:auto;padding:24px 28px;background:#F0EDE8}

        .sec{background:white;border:1px solid rgba(26,20,13,.07);border-radius:14px;margin-bottom:14px;overflow:hidden;box-shadow:0 1px 4px rgba(26,20,13,.04)}
        .sec-hdr{display:flex;align-items:center;gap:11px;padding:14px 18px;border-bottom:1px solid rgba(26,20,13,.06);background:white}
        .sec-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sec-title{font-size:13px;font-weight:600;color:#1A140D;margin-bottom:1px}
        .sec-sub{font-size:10px;color:rgba(26,20,13,.42)}
        .sec-body{padding:18px}

        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .span2{grid-column:span 2}

        .lbl{display:flex;align-items:center;gap:5px;font-size:9px;font-weight:600;color:rgba(26,20,13,.50);text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}
        .req{color:#E53E3E;font-size:11px}
        .opt{font-size:9px;font-weight:400;color:rgba(26,20,13,.28);text-transform:none;letter-spacing:0}

        .inp{width:100%;background:#FAFAF8;border:1.5px solid rgba(26,20,13,.10);border-radius:9px;padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;transition:all .18s}
        .inp::placeholder{color:rgba(26,20,13,.28)}
        .inp:focus{background:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.12)}
        .inp.err{border-color:#E53E3E;background:white}
        .inp.err:focus{box-shadow:0 0 0 3px rgba(229,62,62,.10)}

        .sel{width:100%;background:#FAFAF8;border:1.5px solid rgba(26,20,13,.10);border-radius:9px;padding:10px 32px 10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;cursor:pointer;appearance:none;transition:all .18s;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231A140D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}
        .sel:focus{background-color:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.12)}

        .textarea{width:100%;background:#FAFAF8;border:1.5px solid rgba(26,20,13,.10);border-radius:9px;padding:10px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#1A140D;outline:none;resize:vertical;min-height:80px;line-height:1.55;transition:all .18s}
        .textarea:focus{background:white;border-color:#2D8A58;box-shadow:0 0 0 3px rgba(45,138,88,.12)}
        .textarea::placeholder{color:rgba(26,20,13,.28)}

        .err-msg{font-size:10px;color:#E53E3E;margin-top:4px;display:flex;align-items:center;gap:4px}

        /* reminder rows */
        .rem{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid rgba(26,20,13,.05)}
        .rem:first-child{padding-top:0}
        .rem:last-child{border-bottom:none;padding-bottom:0}
        .rem-l{font-size:12px;font-weight:500;color:#1A140D;margin-bottom:2px}
        .rem-s{font-size:10px;color:rgba(26,20,13,.45);line-height:1.4}
        .tog{width:40px;height:22px;border-radius:100px;cursor:pointer;position:relative;flex-shrink:0;transition:background .2s;border:none;outline:none}
        .tog-k{width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:3px;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.18)}

        /* ── RIGHT PANEL ── */
        .right{
          overflow-y:auto;
          background:linear-gradient(180deg,#0C1A10 0%,#0F2116 100%);
          display:flex;flex-direction:column;gap:0;
          border-left:1px solid rgba(0,0,0,.15);
        }

        .rp-top{padding:24px 20px 20px;border-bottom:1px solid rgba(238,233,226,.08)}
        .rp-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(45,138,88,.20);border:1px solid rgba(45,138,88,.30);border-radius:100px;padding:3px 10px;font-size:9px;font-weight:600;color:#6DC49A;margin-bottom:10px}
        .rp-dot{width:5px;height:5px;border-radius:50%;background:#2D8A58;animation:blink 2s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
        .rp-title{font-family:'Lora',serif;font-size:16px;font-weight:700;color:#EEE9E2;letter-spacing:-.02em;margin-bottom:6px}
        .rp-sub{font-size:11px;font-weight:300;color:rgba(238,233,226,.50);line-height:1.65}

        /* flow */
        .flow-wrap{padding:20px}
        .flow-label{font-size:9px;font-weight:600;color:rgba(238,233,226,.30);text-transform:uppercase;letter-spacing:.10em;margin-bottom:14px}

        .flow-step{display:flex;align-items:flex-start;gap:12px;margin-bottom:0;position:relative}
        .flow-connector{position:absolute;left:13px;top:28px;bottom:-14px;width:1px;background:rgba(238,233,226,.10)}
        .flow-step:last-child .flow-connector{display:none}
        .flow-step+.flow-step{margin-top:14px}

        .flow-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;flex-shrink:0;position:relative;z-index:1}

        .flow-body{}
        .flow-title{font-size:12px;font-weight:500;color:#EEE9E2;margin-bottom:3px}
        .flow-sub{font-size:10px;color:rgba(238,233,226,.45);line-height:1.45;margin-bottom:3px}
        .flow-time{font-size:9px;font-weight:600;display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:100px;background:rgba(238,233,226,.08)}

        /* stats */
        .stats{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(238,233,226,.08);margin:0;border-top:1px solid rgba(238,233,226,.08)}
        .stat{background:#0C1A10;padding:16px 18px}
        .stat-n{font-family:'Lora',serif;font-size:22px;font-weight:700;color:#EEE9E2;letter-spacing:-.02em;line-height:1;margin-bottom:4px}
        .stat-l{font-size:10px;color:rgba(238,233,226,.40);line-height:1.4}

        /* tip */
        .tip{margin:16px;background:rgba(45,138,88,.12);border:1px solid rgba(45,138,88,.25);border-radius:10px;padding:14px}
        .tip-hdr{display:flex;align-items:center;gap:7px;margin-bottom:6px}
        .tip-icon{width:20px;height:20px;border-radius:6px;background:rgba(45,138,88,.25);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .tip-t{font-size:11px;font-weight:600;color:#6DC49A}
        .tip-s{font-size:11px;color:rgba(238,233,226,.55);line-height:1.6}

        /* toast */
        .toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#1B5E3B,#0D3B22);color:white;padding:12px 22px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 8px 28px rgba(27,94,59,.45);z-index:200;animation:slideUp .3s ease}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        @media(max-width:1024px){.body{grid-template-columns:1fr}.right{display:none}}
        @media(max-width:820px){.main{margin-left:0}}
      `}</style>

      <div className="root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="main">

          {/* Topbar */}
          <div className="top">
            <div className="top-l">
              <button className="back" onClick={() => router.push('/dashboard/clients')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Clients
              </button>
              <div className="vdiv"/>
              <div>
                <div className="top-title">Add new client</div>
                <div className="top-sub">Contact details · Reminder settings</div>
              </div>
            </div>
            <div className="top-btns">
              <button className="btn-cancel" onClick={() => router.push('/dashboard/clients')}>Cancel</button>
              <button className="btn-save" onClick={handleSave} disabled={loading}>
                {loading
                  ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{animation:'spin 1s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Saving...</>
                  : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Save client</>
                }
              </button>
            </div>
          </div>

          <div className="body">
            {/* ── LEFT FORM ── */}
            <div className="form-col">

              {/* Contact */}
              <div className="sec">
                <div className="sec-hdr">
                  <div className="sec-icon" style={{background:'rgba(27,94,59,.10)'}}>🤝</div>
                  <div><div className="sec-title">Contact details</div><div className="sec-sub">Basic information about this client</div></div>
                </div>
                <div className="sec-body">
                  <div className="grid2">
                    <div>
                      <div className="lbl">Name <span className="req">*</span></div>
                      <input className={`inp${errors.name?' err':''}`} type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ravi Kumar"/>
                      {errors.name&&<div className="err-msg"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>{errors.name}</div>}
                    </div>
                    <div>
                      <div className="lbl">Company name <span className="opt">optional</span></div>
                      <input className="inp" type="text" value={form.company_name} onChange={e=>set('company_name',e.target.value)} placeholder="Infosys Technologies Ltd"/>
                    </div>
                    <div>
                      <div className="lbl">Email address <span className="opt">optional</span></div>
                      <input className={`inp${errors.email?' err':''}`} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="billing@infosys.com"/>
                      {errors.email&&<div className="err-msg">{errors.email}</div>}
                    </div>
                    <div>
                      <div className="lbl">Mobile number <span className="opt">optional</span></div>
                      <input className={`inp${errors.phone?' err':''}`} type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="98765 43210"/>
                      {errors.phone&&<div className="err-msg">{errors.phone}</div>}
                    </div>
                    <div>
                      <div className="lbl">WhatsApp number <span className="opt">if different from mobile</span></div>
                      <input className="inp" type="tel" value={form.whatsapp} onChange={e=>set('whatsapp',e.target.value)} placeholder="Same as mobile if blank"/>
                    </div>
                    <div>
                      <div className="lbl">GST number <span className="opt">optional</span></div>
                      <input className={`inp${errors.gst_number?' err':''}`} type="text" value={form.gst_number} onChange={e=>set('gst_number',e.target.value.toUpperCase())} placeholder="36AABCI1234C1Z5" maxLength={15}/>
                      {errors.gst_number&&<div className="err-msg">{errors.gst_number}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="sec">
                <div className="sec-hdr">
                  <div className="sec-icon" style={{background:'rgba(24,95,165,.10)'}}>📍</div>
                  <div><div className="sec-title">Address</div><div className="sec-sub">Used on invoice PDF — all optional</div></div>
                </div>
                <div className="sec-body">
                  <div className="grid2">
                    <div className="span2">
                      <div className="lbl">Street address <span className="opt">optional</span></div>
                      <input className="inp" type="text" value={form.address} onChange={e=>set('address',e.target.value)} placeholder="Flat 4B, Hitech City, Madhapur"/>
                    </div>
                    <div>
                      <div className="lbl">City <span className="opt">optional</span></div>
                      <input className="inp" type="text" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Hyderabad"/>
                    </div>
                    <div>
                      <div className="lbl">State <span className="opt">optional</span></div>
                      <select className="sel" value={form.state} onChange={e=>set('state',e.target.value)}>
                        {STATES.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="lbl">Pincode <span className="opt">optional</span></div>
                      <input className="inp" type="text" value={form.pincode} onChange={e=>set('pincode',e.target.value)} placeholder="500081" maxLength={6}/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminders */}
              <div className="sec">
                <div className="sec-hdr">
                  <div className="sec-icon" style={{background:'rgba(232,105,42,.10)'}}>💬</div>
                  <div><div className="sec-title">WhatsApp reminder schedule</div><div className="sec-sub">Sent automatically after invoice due date — toggle to customise</div></div>
                </div>
                <div className="sec-body">
                  {([
                    {k:'day7'  as const, l:'Day 7 — polite follow-up',  s:'"Just a gentle reminder about Invoice #XX"'},
                    {k:'day14' as const, l:'Day 14 — follow-up + PDF',  s:'Second message with invoice PDF re-attached'},
                    {k:'day30' as const, l:'Day 30 — firm reminder',     s:'Quotes the late fee clause from the signed contract'},
                  ]).map(r=>(
                    <div key={r.k} className="rem">
                      <div><div className="rem-l">{r.l}</div><div className="rem-s">{r.s}</div></div>
                      <button className="tog" style={{background:reminders[r.k]?'#1B5E3B':'rgba(26,20,13,.15)'}} onClick={()=>setReminders(p=>({...p,[r.k]:!p[r.k]}))}>
                        <div className="tog-k" style={{left:reminders[r.k]?'21px':'3px'}}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="sec">
                <div className="sec-hdr">
                  <div className="sec-icon" style={{background:'rgba(133,79,11,.10)'}}>📝</div>
                  <div><div className="sec-title">Internal notes</div><div className="sec-sub">Not shown on invoices — just for your reference</div></div>
                </div>
                <div className="sec-body">
                  <div className="lbl">Notes <span className="opt">optional</span></div>
                  <textarea className="textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="e.g. Always pays late — follow up early. Key contact is Priya in accounts."/>
                </div>
              </div>

            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="right">

              <div className="rp-top">
                <div className="rp-badge"><span className="rp-dot"/>Fully automated</div>
                <div className="rp-title">What happens<br/>after you save</div>
                <div className="rp-sub">Vasool automates the entire payment collection journey for every invoice you send to this client. Zero manual follow-up.</div>
              </div>

              <div className="flow-wrap">
                <div className="flow-label">Automation flow</div>
                {FLOW.map((s,i)=>(
                  <div key={i} className="flow-step">
                    <div className="flow-connector"/>
                    <div className="flow-num" style={{background:s.bg,boxShadow:`0 0 0 4px ${s.ring}`}}>{s.n}</div>
                    <div className="flow-body">
                      <div className="flow-title">{s.title}</div>
                      <div className="flow-sub">{s.sub}</div>
                      <div className="flow-time" style={{color:s.tc}}>{s.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="stats">
                <div className="stat"><div className="stat-n">14 days</div><div className="stat-l">faster payment on average with reminders</div></div>
                <div className="stat"><div className="stat-n">₹2.4L</div><div className="stat-l">avg recovered per user per year</div></div>
              </div>

              <div className="tip">
                <div className="tip-hdr">
                  <div className="tip-icon">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6DC49A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  </div>
                  <span className="tip-t">Pro tip</span>
                </div>
                <div className="tip-s">Upload this client&apos;s contract first — Vasool will auto-fill the invoice amount, due date, and late fee terms so you never type them manually.</div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {saved&&(
        <div className="toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          Client saved! Redirecting...
        </div>
      )}
    </>
  )
}