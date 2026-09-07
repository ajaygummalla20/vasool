'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const STATES = [
  'Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Maharashtra',
  'Delhi', 'Uttar Pradesh', 'Gujarat', 'Rajasthan', 'West Bengal',
  'Madhya Pradesh', 'Kerala', 'Punjab', 'Haryana', 'Bihar', 'Other',
]

interface Props {
  initialProfile: any
  userId: string
  userEmail: string
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function OnboardingPage({ initialProfile, userId, userEmail }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    business_name: initialProfile?.business_name || '',
    full_name: initialProfile?.full_name || '',
    phone: initialProfile?.phone || '',
    whatsapp: initialProfile?.whatsapp || '',
    gst_number: initialProfile?.gst_number || '',
    pan_number: initialProfile?.pan_number || '',
    state: initialProfile?.state || 'Telangana',
    address: initialProfile?.address || '',
    city: initialProfile?.city || '',
    pincode: initialProfile?.pincode || '',
    invoice_prefix: initialProfile?.invoice_prefix || 'INV',
    invoice_counter: initialProfile?.invoice_counter || 1,
  })

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const sb = getSupabase()
      const { error } = await sb.from('profiles').upsert({
        id: userId,
        ...form,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (e) {
      console.error(e)
      alert('Error saving profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <style>{`
        .ob-root{min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;padding:24px;position:relative;overflow:hidden}
        
        .ob-ambient{position:absolute;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.15) 0%,transparent 70%);filter:blur(60px);pointer-events:none}
        .ob-ambient.one{top:-100px;right:-100px}
        .ob-ambient.two{bottom:-150px;left:-150px;background:radial-gradient(circle,rgba(5,150,105,.12) 0%,transparent 70%)}

        .ob-card{width:100%;max-width:620px;background:rgba(18,30,22,.85);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:36px;box-shadow:0 30px 60px -15px rgba(0,0,0,.8);position:relative;z-index:10}
        
        .ob-brand{display:flex;align-items:center;gap:10px;margin-bottom:24px}
        .ob-logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10B981,#059669);display:flex;align-items:center;justify-content:center;font-weight:900;color:white;font-size:18px;box-shadow:0 0 20px rgba(16,185,129,.4)}
        .ob-brand-text{font-size:18px;font-weight:800;letter-spacing:-.02em;color:#FFF}
        .ob-brand-sub{font-size:11px;color:rgba(255,255,255,.45)}

        .ob-steps{display:flex;gap:8px;margin-bottom:28px}
        .ob-step-bar{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.1);transition:all .3s}
        .ob-step-bar.active{background:#10B981;box-shadow:0 0 10px rgba(16,185,129,.5)}

        .ob-title{font-size:22px;font-weight:800;color:#FFF;margin-bottom:4px}
        .ob-desc{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:24px}

        .ob-field{margin-bottom:16px}
        .ob-label{display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .ob-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px 16px;font-size:14px;color:#FFF;font-family:'Outfit',sans-serif;outline:none;transition:border .2s}
        .ob-input:focus{border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,.2)}
        .ob-input::placeholder{color:rgba(255,255,255,.25)}

        .ob-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}

        .ob-actions{display:flex;justify-content:space-between;align-items:center;margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08)}
        .ob-btn-sec{padding:10px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.7);font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif}
        .ob-btn-pri{padding:11px 26px;border-radius:12px;border:none;background:linear-gradient(135deg,#10B981,#059669);color:#FFF;font-size:13px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;box-shadow:0 4px 16px rgba(16,185,129,.4);transition:all .2s}
        .ob-btn-pri:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 25px rgba(16,185,129,.6)}
        .ob-btn-pri:disabled{opacity:.6;cursor:not-allowed}

        .ob-preview-box{background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.15);border-radius:14px;padding:18px;margin-top:16px;text-align:center}

        @media(max-width:600px){
          .ob-root{padding:12px}
          .ob-card{padding:20px 16px; border-radius:18px}
          .ob-row2{grid-template-columns:1fr; gap:0}
          .ob-actions{flex-direction:column-reverse; gap:10px}
          .ob-btn-sec, .ob-btn-pri{width:100%; text-align:center; justify-content:center}
        }
      `}</style>

      <div className="ob-root">
        <div className="ob-ambient one" />
        <div className="ob-ambient two" />

        <div className="ob-card">
          <div className="ob-brand">
            <div className="ob-logo" style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
              <img src="/settlr-logo.png" alt="Settlr" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
            </div>
            <div>
              <div className="ob-brand-text">Settlr</div>
              <div className="ob-brand-sub">MSME Financial Operating System · Setup Guide</div>
            </div>
          </div>

          <div className="ob-steps">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`ob-step-bar ${s <= step ? 'active' : ''}`} />
            ))}
          </div>

          {/* STEP 1: Business Identity */}
          {step === 1 && (
            <div>
              <div className="ob-title">1. Tell us about your business</div>
              <div className="ob-desc">
                Your business name and contact details will appear on all your invoices and WhatsApp
                reminders.
              </div>

              <div className="ob-field">
                <label className="ob-label">Business / Agency Name</label>
                <input
                  className="ob-input"
                  placeholder="e.g. Apex Software & Consulting"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                />
              </div>

              <div className="ob-field">
                <label className="ob-label">Your Full Name</label>
                <input
                  className="ob-input"
                  placeholder="e.g. Ajay Kumar"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>

              <div className="ob-row2">
                <div className="ob-field">
                  <label className="ob-label">Mobile Phone</label>
                  <input
                    className="ob-input"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="ob-field">
                  <label className="ob-label">WhatsApp Number</label>
                  <input
                    className="ob-input"
                    placeholder="9876543210"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Legal & Tax */}
          {step === 2 && (
            <div>
              <div className="ob-title">2. Legal & GST Details</div>
              <div className="ob-desc">
                For GST-compliant invoices and automated GSTR-1 reports. (Leave blank if you don't
                have GST yet).
              </div>

              <div className="ob-field">
                <label className="ob-label">GSTIN (15 Digits - Optional)</label>
                <input
                  className="ob-input"
                  placeholder="36AAAAA0000A1Z5"
                  value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="ob-row2">
                <div className="ob-field">
                  <label className="ob-label">PAN Number</label>
                  <input
                    className="ob-input"
                    placeholder="ABCDE1234F"
                    value={form.pan_number}
                    onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="ob-field">
                  <label className="ob-label">Operating State</label>
                  <select
                    className="ob-input"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  >
                    {STATES.map((st) => (
                      <option key={st} value={st} style={{ background: '#121E16', color: '#FFF' }}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Address */}
          {step === 3 && (
            <div>
              <div className="ob-title">3. Official Registered Address</div>
              <div className="ob-desc">
                This appears in the header and footer of your invoice PDFs.
              </div>

              <div className="ob-field">
                <label className="ob-label">Street / Office Address</label>
                <input
                  className="ob-input"
                  placeholder="Suite 402, Cyber Towers, Hitec City"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="ob-row2">
                <div className="ob-field">
                  <label className="ob-label">City</label>
                  <input
                    className="ob-input"
                    placeholder="Hyderabad"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="ob-field">
                  <label className="ob-label">Pincode</label>
                  <input
                    className="ob-input"
                    placeholder="500081"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Invoice Branding */}
          {step === 4 && (
            <div>
              <div className="ob-title">4. Invoice Format & Numbering</div>
              <div className="ob-desc">
                Customize how your invoice numbers will appear to clients.
              </div>

              <div className="ob-row2">
                <div className="ob-field">
                  <label className="ob-label">Invoice Prefix</label>
                  <input
                    className="ob-input"
                    placeholder="INV"
                    value={form.invoice_prefix}
                    onChange={(e) =>
                      setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="ob-field">
                  <label className="ob-label">Starting Counter Number</label>
                  <input
                    className="ob-input"
                    type="number"
                    min="1"
                    value={form.invoice_counter}
                    onChange={(e) =>
                      setForm({ ...form, invoice_counter: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="ob-preview-box">
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>
                  Your First Invoice Will Be
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#34D399' }}>
                  {form.invoice_prefix}-{String(form.invoice_counter).padStart(4, '0')}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="ob-actions">
            {step > 1 ? (
              <button className="ob-btn-sec" onClick={handleBack}>
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button className="ob-btn-pri" onClick={handleNext}>
                Continue →
              </button>
            ) : (
              <button className="ob-btn-pri" onClick={handleFinish} disabled={saving}>
                {saving ? 'Setting up...' : '🚀 Launch Settlr OS'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
