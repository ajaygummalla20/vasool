'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface Subscription {
  id?: string
  plan_id: 'free' | 'pro' | 'agency'
  status: 'active' | 'expired' | 'cancelled'
  billing_cycle: 'monthly' | 'yearly'
  amount: number
  current_period_end?: string
  created_at?: string
}

interface Usage {
  invoicesCreated: number
  clientsAdded: number
}

interface Props {
  subscription: Subscription | null
  usage: Usage
  userName: string
  userEmail: string
  userPhone: string
  userId: string
  razorpayKeyId: string
}

function fmtINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function BillingPage({
  subscription: initialSub,
  usage,
  userName,
  userEmail,
  userPhone,
  userId,
  razorpayKeyId,
}: Props) {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription>(
    initialSub || {
      plan_id: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      amount: 0,
    }
  )

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'plans' | 'faq' | 'invoices'>('plans')

  // Load Razorpay Checkout Script dynamically
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleUpgrade = async (planId: 'pro' | 'agency') => {
    setLoadingPlan(planId)
    try {
      // 1. Create order on backend
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initialize order')

      // 2. If Razorpay SDK is available and key is configured
      if (typeof window.Razorpay !== 'undefined' && data.keyId && !data.isTest) {
        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'Settlr Technologies',
          description: `${planId.toUpperCase()} Plan (${cycle === 'yearly' ? 'Annual' : 'Monthly'})`,
          order_id: data.orderId,
          prefill: {
            name: userName,
            email: userEmail,
            contact: userPhone || '',
          },
          theme: {
            color: '#10B981',
          },
          modal: {
            ondismiss: function () {
              setLoadingPlan(null)
            },
          },
          handler: async function (response: any) {
            // Verify signature
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...response,
                planId,
                cycle,
                isTest: false,
              }),
            })

            const verifyData = await verifyRes.json()
            if (verifyData.success) {
              setSubscription({
                plan_id: planId,
                status: 'active',
                billing_cycle: cycle,
                amount: verifyData.amount,
                current_period_end: verifyData.expiresAt,
              })
              setShowSuccessModal(true)
            }
          },
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
      } else {
        // Test simulation mode (Instant upgrade for development / preview)
        const verifyRes = await fetch('/api/billing/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: data.orderId,
            razorpay_payment_id: `pay_test_${Date.now()}`,
            razorpay_signature: 'test_signature',
            planId,
            cycle,
            isTest: true,
          }),
        })

        const verifyData = await verifyRes.json()
        if (verifyData.success) {
          setSubscription({
            plan_id: planId,
            status: 'active',
            billing_cycle: cycle,
            amount: verifyData.amount,
            current_period_end: verifyData.expiresAt,
          })
          setShowSuccessModal(true)
        }
      }
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Payment initiation failed. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const currentPlan = subscription.plan_id
  const isPro = currentPlan === 'pro' || currentPlan === 'agency'
  const isAgency = currentPlan === 'agency'

  return (
    <>
      <style>{`
        .bl-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6;font-family:'Outfit',sans-serif}
        .bl-main{flex:1;margin-left:220px;display:flex;flex-direction:column;min-height:100vh}
        .bl-top{background:rgba(12,22,15,.85);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08);padding:18px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
        .bl-title{font-size:22px;font-weight:800;color:#FFF}
        .bl-sub{font-size:11px;color:rgba(255,255,255,.45);margin-top:2px}
        .bl-content{flex:1;padding:28px 32px;display:flex;flex-direction:column;gap:24px;max-width:1440px;width:100%;margin:0 auto}

        /* Current Plan Banner */
        .bl-status-banner{
          background: rgba(18,30,22,.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 20px; padding: 24px 28px;
          display: flex; justify-content: space-between; align-items: center; gap: 24px;
        }
        .bl-badge-curr{
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 14px; border-radius: 100px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: .08em;
        }
        .bl-badge-free{background: rgba(255,255,255,.08); color: rgba(255,255,255,.7); border: 1px solid rgba(255,255,255,.15);}
        .bl-badge-pro{background: rgba(16,185,129,.15); color: #34D399; border: 1px solid rgba(16,185,129,.35); box-shadow: 0 0 15px rgba(16,185,129,.2);}
        .bl-badge-agency{background: rgba(59,130,246,.15); color: #60A5FA; border: 1px solid rgba(59,130,246,.35); box-shadow: 0 0 15px rgba(59,130,246,.2);}

        /* Switcher */
        .bl-cycle-wrap{display: flex; align-items: center; justify-content: center; gap: 12px; margin: 12px 0 6px;}
        .bl-cycle-box{background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 100px; padding: 4px; display: flex; gap: 4px;}
        .bl-cycle-btn{padding: 8px 22px; border-radius: 100px; border: none; background: transparent; color: rgba(255,255,255,.6); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Outfit', sans-serif; transition: all .2s;}
        .bl-cycle-btn.active{background: #10B981; color: #FFF; box-shadow: 0 2px 10px rgba(16,185,129,.4);}
        .bl-save-tag{background: linear-gradient(135deg,#F59E0B,#D97706); color: #000; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 100px;}

        /* Pricing Grid */
        .bl-grid{display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;}
        .bl-card{
          background: rgba(18,30,22,.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px; padding: 32px 28px;
          display: flex; flex-direction: column; justify-content: space-between;
          position: relative; transition: all .25s cubic-bezier(.16,1,.3,1);
        }
        .bl-card:hover{transform: translateY(-4px); border-color: rgba(16,185,129,.3); box-shadow: 0 25px 50px -15px rgba(0,0,0,.8);}
        
        .bl-card.featured{
          border-color: rgba(16,185,129,.4);
          background: linear-gradient(180deg, rgba(16,185,129,.08) 0%, rgba(18,30,22,.85) 100%);
          box-shadow: 0 0 35px rgba(16,185,129,.15);
        }
        .bl-pop-tag{
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #10B981, #059669);
          color: #FFF; font-size: 10px; font-weight: 800; text-transform: uppercase;
          letter-spacing: .08em; padding: 4px 14px; border-radius: 100px;
          box-shadow: 0 4px 12px rgba(16,185,129,.4);
        }

        .bl-card-title{font-size: 20px; font-weight: 800; color: #FFF;}
        .bl-card-desc{font-size: 12px; color: rgba(255,255,255,.5); margin-top: 4px; min-height: 36px;}
        .bl-price{display: flex; align-items: baseline; gap: 4px; margin: 20px 0;}
        .bl-price-num{font-size: 38px; font-weight: 900; color: #FFF; letter-spacing: -.03em;}
        .bl-price-period{font-size: 13px; color: rgba(255,255,255,.45);}

        .bl-feat-list{display: flex; flex-direction: column; gap: 12px; margin: 24px 0; border-top: 1px solid rgba(255,255,255,.06); padding-top: 20px;}
        .bl-feat-item{display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: rgba(255,255,255,.8); line-height: 1.4;}
        .bl-feat-icon{color: #34D399; font-size: 14px; flex-shrink: 0; margin-top: 1px;}
        .bl-feat-icon.dim{color: rgba(255,255,255,.25);}

        .bl-btn-plan{
          width: 100%; padding: 13px; border-radius: 12px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: 'Outfit', sans-serif; transition: all .2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .bl-btn-free{background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); color: rgba(255,255,255,.7);}
        .bl-btn-pro{background: linear-gradient(135deg,#10B981,#059669); border: none; color: #FFF; box-shadow: 0 4px 16px rgba(16,185,129,.4);}
        .bl-btn-pro:hover{transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16,185,129,.6);}
        .bl-btn-agency{background: rgba(59,130,246,.15); border: 1px solid rgba(59,130,246,.35); color: #60A5FA;}
        .bl-btn-agency:hover{background: rgba(59,130,246,.25);}

        /* Modal */
        .bl-overlay{position: fixed; inset: 0; background: rgba(0,0,0,.75); backdrop-filter: blur(12px); z-index: 100; display: flex; align-items: center; justify-content: center;}
        .bl-modal{
          background: rgba(14,24,18,.95); backdrop-filter: blur(24px);
          border: 1px solid rgba(16,185,129,.4); border-radius: 24px;
          padding: 36px; max-width: 480px; width: 90vw; text-align: center;
          box-shadow: 0 25px 60px rgba(0,0,0,.8), 0 0 50px rgba(16,185,129,.2);
        }

        /* Comparison Table */
        .bl-comp-table{width: 100%; border-collapse: collapse; margin-top: 16px;}
        .bl-comp-th{font-size: 11px; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .08em; padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.08);}
        .bl-comp-td{padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 13px; color: rgba(255,255,255,.85);}

        @media(max-width:1024px){
          .bl-main{margin-left:0; padding-top:56px; padding-bottom:80px}
          .bl-top{padding:14px 16px; flex-wrap:wrap; gap:12px}
          .bl-content{padding:16px}
          .bl-grid{grid-template-columns:1fr}
          .bl-status-banner{flex-direction:column; align-items:stretch; gap:16px}
          .bl-comp-table-wrap{overflow-x:auto}
          .bl-comp-table{min-width:540px}
        }
        @media(max-width:640px){
          .bl-top{flex-direction:column; align-items:flex-start}
          .bl-top div:last-child{width:100%}
          .bl-top div:last-child button{flex:1; justify-content:center}
        }
      `}</style>

      <div className="bl-root">
        <Sidebar userName={userName} userEmail={userEmail} />
        <div className="bl-main">
          <div className="bl-top">
            <div>
              <div className="bl-title">Subscription & Billing</div>
              <div className="bl-sub">Manage your plan, payment methods, and GST business tier</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`ex-filter-btn ${activeTab === 'plans' ? 'active' : ''}`}
                onClick={() => setActiveTab('plans')}
              >
                ⚡ Plans & Pricing
              </button>
              <button
                className={`ex-filter-btn ${activeTab === 'faq' ? 'active' : ''}`}
                onClick={() => setActiveTab('faq')}
              >
                ❓ FAQ & GST Tax Billing
              </button>
            </div>
          </div>

          <div className="bl-content">
            {/* Current Status Header Banner */}
            <div className="bl-status-banner">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className={`bl-badge-curr ${
                      currentPlan === 'agency'
                        ? 'bl-badge-agency'
                        : isPro
                        ? 'bl-badge-pro'
                        : 'bl-badge-free'
                    }`}
                  >
                    {currentPlan === 'agency'
                      ? '🏢 Agency Plan'
                      : isPro
                      ? '⚡ Pro Growth Member'
                      : '🌱 Free Starter Plan'}
                  </span>
                  {subscription.status === 'active' && isPro && (
                    <span style={{ fontSize: 11, color: '#34D399' }}>● Active</span>
                  )}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF', marginTop: 10 }}>
                  {isPro
                    ? `Unlimited access active · Renews on ${fmtDate(subscription.current_period_end)}`
                    : 'You are on the Free Starter tier (3 invoices/month & 2 clients)'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
                  {isPro
                    ? 'Includes AI Risk Redlines, AI Receipt OCR Scanner, and MSMED Legal Notice Generator.'
                    : 'Upgrade to Pro for unlimited invoices, AI contract audits, and dynamic UPI QR billing.'}
                </div>
              </div>

              {/* Usage Progress */}
              <div
                style={{
                  background: 'rgba(255,255,255,.03)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 14,
                  padding: '14px 20px',
                  minWidth: 240,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                  Monthly Quota Usage
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Invoices Issued:</span>
                  <strong>{isPro ? 'Unlimited (∞)' : `${usage.invoicesCreated} / 3`}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>Clients Managed:</span>
                  <strong>{isPro ? 'Unlimited (∞)' : `${usage.clientsAdded} / 2`}</strong>
                </div>
              </div>
            </div>

            {activeTab === 'plans' && (
              <>
                {/* Billing Cycle Switcher */}
                <div className="bl-cycle-wrap">
                  <div className="bl-cycle-box">
                    <button
                      className={`bl-cycle-btn ${cycle === 'monthly' ? 'active' : ''}`}
                      onClick={() => setCycle('monthly')}
                    >
                      Monthly Billing
                    </button>
                    <button
                      className={`bl-cycle-btn ${cycle === 'yearly' ? 'active' : ''}`}
                      onClick={() => setCycle('yearly')}
                    >
                      Annual Billing <span className="bl-save-tag">SAVE 33%</span>
                    </button>
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="bl-grid">
                  {/* FREE PLAN */}
                  <div className="bl-card">
                    <div>
                      <div className="bl-card-title">🌱 Free Starter</div>
                      <div className="bl-card-desc">
                        For solo freelancers and new contractors issuing occasional bills.
                      </div>
                      <div className="bl-price">
                        <span className="bl-price-num">₹0</span>
                        <span className="bl-price-period">/ forever</span>
                      </div>

                      <div className="bl-feat-list">
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Up to 3 Invoices per month</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Up to 2 Client records</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Basic GST Tax Calculation (CGST/SGST)</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Manual WhatsApp Reminder logs</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon dim">✕</span>
                          <span style={{ color: 'rgba(255,255,255,.35)' }}>AI Contract Risk Redlines</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon dim">✕</span>
                          <span style={{ color: 'rgba(255,255,255,.35)' }}>AI Receipt OCR Camera Scanner</span>
                        </div>
                      </div>
                    </div>

                    <button className="bl-btn-plan bl-btn-free" disabled>
                      {currentPlan === 'free' ? 'Current Active Plan' : 'Free Tier'}
                    </button>
                  </div>

                  {/* PRO GROWTH PLAN (FEATURED) */}
                  <div className="bl-card featured">
                    <span className="bl-pop-tag">⚡ Most Popular for MSMEs</span>
                    <div>
                      <div className="bl-card-title" style={{ color: '#34D399' }}>
                        ⚡ Pro Growth
                      </div>
                      <div className="bl-card-desc">
                        Full financial and legal operating system for established contractors & MSMEs.
                      </div>
                      <div className="bl-price">
                        <span className="bl-price-num">
                          {cycle === 'yearly' ? '₹3,999' : '₹499'}
                        </span>
                        <span className="bl-price-period">
                          {cycle === 'yearly' ? '/ year (₹333/mo)' : '/ month'}
                        </span>
                      </div>

                      <div className="bl-feat-list">
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>Unlimited Invoices & Client Records</strong>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>AI Contract Redlines & Risk Flags</strong>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>AI Receipt OCR Camera Scanner</strong>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>Dynamic NPCI UPI QR Codes on Invoices</strong>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>MSMED Act 45-Day 3x Interest & Legal Notice</strong>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>GSTR-1 JSON & CA Audit Export Pack</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      className="bl-btn-plan bl-btn-pro"
                      onClick={() => handleUpgrade('pro')}
                      disabled={loadingPlan === 'pro'}
                    >
                      {loadingPlan === 'pro'
                        ? 'Opening Razorpay...'
                        : currentPlan === 'pro'
                        ? '✓ Renew / Extend Pro'
                        : '⚡ Upgrade to Pro Now'}
                    </button>
                  </div>

                  {/* AGENCY PLAN */}
                  <div className="bl-card">
                    <div>
                      <div className="bl-card-title">🏢 Agency & CA Pro</div>
                      <div className="bl-card-desc">
                        For multi-client agencies, accounting firms, and high-volume practices.
                      </div>
                      <div className="bl-price">
                        <span className="bl-price-num">
                          {cycle === 'yearly' ? '₹11,999' : '₹1,499'}
                        </span>
                        <span className="bl-price-period">
                          {cycle === 'yearly' ? '/ year (₹999/mo)' : '/ month'}
                        </span>
                      </div>

                      <div className="bl-feat-list">
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <strong>Everything in Pro included</strong>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Multi-GSTIN & Branch support</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Multi-user team access (5 Seats)</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Bulk WhatsApp Reminders API</span>
                        </div>
                        <div className="bl-feat-item">
                          <span className="bl-feat-icon">✓</span>
                          <span>Priority Phone & WhatsApp Support</span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="bl-btn-plan bl-btn-agency"
                      onClick={() => handleUpgrade('agency')}
                      disabled={loadingPlan === 'agency'}
                    >
                      {loadingPlan === 'agency'
                        ? 'Opening Razorpay...'
                        : currentPlan === 'agency'
                        ? '✓ Active Agency License'
                        : '🏢 Upgrade to Agency'}
                    </button>
                  </div>
                </div>

                {/* Features Breakdown Comparison */}
                <div
                  className="kokonut-card"
                  style={{ marginTop: 24, padding: '28px 32px' }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 4 }}>
                    Detailed Feature Matrix
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 20 }}>
                    Compare what each plan provides for your business operations.
                  </div>

                  <table className="bl-comp-table">
                    <thead>
                      <tr>
                        <th className="bl-comp-th">Feature</th>
                        <th className="bl-comp-th" style={{ width: 140 }}>Free Starter</th>
                        <th className="bl-comp-th" style={{ width: 160, color: '#34D399' }}>Pro Growth (₹499)</th>
                        <th className="bl-comp-th" style={{ width: 160, color: '#60A5FA' }}>Agency (₹1,499)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="bl-comp-td">Monthly Invoices</td>
                        <td className="bl-comp-td">3 per month</td>
                        <td className="bl-comp-td" style={{ color: '#34D399', fontWeight: 700 }}>Unlimited (∞)</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA', fontWeight: 700 }}>Unlimited (∞)</td>
                      </tr>
                      <tr>
                        <td className="bl-comp-td">Client Management</td>
                        <td className="bl-comp-td">2 clients</td>
                        <td className="bl-comp-td" style={{ color: '#34D399', fontWeight: 700 }}>Unlimited (∞)</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA', fontWeight: 700 }}>Unlimited (∞)</td>
                      </tr>
                      <tr>
                        <td className="bl-comp-td">AI Contract Risk Analysis</td>
                        <td className="bl-comp-td" style={{ color: 'rgba(255,255,255,.3)' }}>—</td>
                        <td className="bl-comp-td" style={{ color: '#34D399' }}>✓ Full Redlines</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA' }}>✓ Full Redlines</td>
                      </tr>
                      <tr>
                        <td className="bl-comp-td">AI Mobile Camera Receipt OCR</td>
                        <td className="bl-comp-td" style={{ color: 'rgba(255,255,255,.3)' }}>—</td>
                        <td className="bl-comp-td" style={{ color: '#34D399' }}>✓ Instant Scanner</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA' }}>✓ Instant Scanner</td>
                      </tr>
                      <tr>
                        <td className="bl-comp-td">Dynamic NPCI UPI QR Codes</td>
                        <td className="bl-comp-td" style={{ color: 'rgba(255,255,255,.3)' }}>—</td>
                        <td className="bl-comp-td" style={{ color: '#34D399' }}>✓ GPay/PhonePe</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA' }}>✓ GPay/PhonePe</td>
                      </tr>
                      <tr>
                        <td className="bl-comp-td">MSMED Act 45-Day Demand Notice</td>
                        <td className="bl-comp-td" style={{ color: 'rgba(255,255,255,.3)' }}>—</td>
                        <td className="bl-comp-td" style={{ color: '#34D399' }}>✓ 3x RBI Rate Notice</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA' }}>✓ 3x RBI Rate Notice</td>
                      </tr>
                      <tr>
                        <td className="bl-comp-td">GSTR-1 JSON & CA Audit Export</td>
                        <td className="bl-comp-td">Basic</td>
                        <td className="bl-comp-td" style={{ color: '#34D399' }}>✓ Full JSON & CSV</td>
                        <td className="bl-comp-td" style={{ color: '#60A5FA' }}>✓ Full JSON & CSV</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'faq' && (
              <div className="kokonut-card" style={{ padding: '32px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 16 }}>
                  Frequently Asked Questions & Billing Details
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399' }}>
                      Can I claim GST Input Tax Credit (ITC) on my Settlr subscription?
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
                      Yes! When you upgrade, your GSTIN will be recorded on the subscription tax invoice, allowing you to claim full 18% GST Input Tax Credit against your business.
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399' }}>
                      What payment methods are accepted?
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
                      Through our secure Razorpay gateway, we accept all Indian UPI apps (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard Credit & Debit cards, and NetBanking across 50+ banks.
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#34D399' }}>
                      Can I cancel anytime?
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>
                      Yes, you can cancel or switch plans at any time. Your Pro benefits remain active until the end of your prepaid billing period.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Confetti Modal */}
      {showSuccessModal && (
        <div className="bl-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="bl-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FFF' }}>
              Welcome to Settlr Pro!
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 8 }}>
              Your account has been upgraded successfully. You now have unlimited invoices, AI contract risk redlines, and AI receipt scanning!
            </div>

            <button
              className="kokonut-btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
              onClick={() => {
                setShowSuccessModal(false)
                router.push('/dashboard')
              }}
            >
              🚀 Launch Pro Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  )
}
