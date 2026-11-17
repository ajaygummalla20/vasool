'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

declare global {
  interface Window {
    Razorpay?: any
    Youpi?: any
  }
}

// ── CORE SVG ICON SYSTEM (REPLACING EMOJIS & AI ARTIFACTS) ─────────────
function CheckIcon({ className = 'w-4 h-4 text-emerald-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CrossIcon({ className = 'w-4 h-4 text-zinc-600' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ZapIcon({ className = 'w-4 h-4 text-emerald-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function BuildingIcon({ className = 'w-4 h-4 text-blue-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  )
}

function SparklesIcon({ className = 'w-4 h-4 text-emerald-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.885L20 10.8l-4.756 3.692L16.824 21 12 17.5 7.176 21l1.58-6.508L4 10.8l6.088-1.915L12 3z" />
    </svg>
  )
}

function HelpCircleIcon({ className = 'w-4 h-4 text-zinc-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CopyIcon({ className = 'w-3.5 h-3.5 text-zinc-400' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckCircleIcon({ className = 'w-4 h-4 text-emerald-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ShieldCheckIcon({ className = 'w-4 h-4 text-emerald-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function ArrowRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function SmartphoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  )
}

function AlertTriangleIcon({ className = 'w-4 h-4 text-amber-400' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

// ── TYPES & INTERFACES ───────────────────────────────────────────────
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
  youpiCheckoutUrl?: string
  youpiMerchantId?: string
  razorpayKeyId?: string
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
  youpiCheckoutUrl = 'http://localhost:7000',
  youpiMerchantId = 'settlr_merchant_dev',
  razorpayKeyId,
}: Props) {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription>(
    initialSub && initialSub.plan_id !== 'free'
      ? initialSub
      : {
          plan_id: 'pro',
          status: 'active',
          current_period_end: '2099-12-31T23:59:59.000Z',
          billing_cycle: 'yearly',
          amount: 0,
        }
  )

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'plans' | 'faq'>('plans')

  // Native 0% Fee UPI QR Modal State
  const [upiModal, setUpiModal] = useState<{
    open: boolean
    orderId: string
    planId: 'pro' | 'agency'
    cycle: 'monthly' | 'yearly'
    amount: number
    merchantUpi: string
    merchantName: string
  } | null>(null)
  const [utrInput, setUtrInput] = useState('')
  const [verifyingUtr, setVerifyingUtr] = useState(false)
  const [utrError, setUtrError] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)

  // Load Checkout scripts dynamically for future paid activation
  useEffect(() => {
    const youpiScript = document.createElement('script')
    youpiScript.src = `${youpiCheckoutUrl}/checkout.js`
    youpiScript.async = true
    youpiScript.setAttribute('data-youpi-key', youpiMerchantId)
    youpiScript.setAttribute('data-currency', 'INR')
    document.body.appendChild(youpiScript)

    const rzpScript = document.createElement('script')
    rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js'
    rzpScript.async = true
    document.body.appendChild(rzpScript)

    return () => {
      if (document.body.contains(youpiScript)) document.body.removeChild(youpiScript)
      if (document.body.contains(rzpScript)) document.body.removeChild(rzpScript)
    }
  }, [youpiCheckoutUrl, youpiMerchantId])

  const handleUpgrade = async (planId: 'pro' | 'agency') => {
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, cycle }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to initialize order')

      if (data.gateway === 'native_upi') {
        setUpiModal({
          open: true,
          orderId: data.orderId,
          planId,
          cycle,
          amount: data.amount,
          merchantUpi: data.merchantUpi || 'settlr@upi',
          merchantName: data.merchantName || 'Settlr Technologies',
        })
        setUtrInput('')
        setUtrError('')
        return
      }

      if (typeof window !== 'undefined' && window.Youpi) {
        window.Youpi.open({
          order_id: data.orderId,
          amount: data.amount,
          currency: 'INR',
          name: 'Settlr Pro Membership',
          description: `Settlr ${planId.toUpperCase()} Subscription (${cycle})`,
          handler: async function (response: any) {
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gateway: 'youpi',
                orderId: data.orderId,
                paymentId: response.payment_id || response.id,
                signature: response.signature,
                planId,
                billing_cycle: cycle,
              }),
            })
            const verifyData = await verifyRes.json()
            if (verifyRes.ok) {
              setSubscription({
                plan_id: planId,
                status: 'active',
                billing_cycle: cycle,
                amount: data.amount,
                current_period_end: new Date(
                  Date.now() + (cycle === 'yearly' ? 365 : 30) * 86400000
                ).toISOString(),
              })
              setShowSuccessModal(true)
            } else {
              alert(verifyData.error || 'Payment verification failed.')
            }
          },
        })
        return
      }
    } catch (err: any) {
      alert(err.message || 'Unable to open checkout gateway.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!upiModal) return
    const cleanUtr = utrInput.trim()

    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 20) {
      setUtrError('Please enter a valid 6 to 12 digit UPI reference / UTR number.')
      return
    }

    setVerifyingUtr(true)
    setUtrError('')

    try {
      const verifyRes = await fetch('/api/billing/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: 'native_upi',
          orderId: upiModal.orderId,
          paymentId: cleanUtr,
          planId: upiModal.planId,
          billing_cycle: upiModal.cycle,
        }),
      })

      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Verification failed. Please double-check your UTR.')
      }

      setSubscription({
        plan_id: upiModal.planId,
        status: 'active',
        billing_cycle: upiModal.cycle,
        amount: upiModal.amount,
        current_period_end: new Date(
          Date.now() + (upiModal.cycle === 'yearly' ? 365 : 30) * 86400000
        ).toISOString(),
      })
      setUpiModal(null)
      setShowSuccessModal(true)
    } catch (err: any) {
      setUtrError(err.message || 'Failed to verify transaction. Please check your UTR.')
    } finally {
      setVerifyingUtr(false)
    }
  }

  const currentPlan = subscription.plan_id
  const isPro = currentPlan === 'pro' || currentPlan === 'agency'

  return (
    <div className="flex min-h-screen bg-[#090A0B] text-zinc-100 font-sans antialiased">
      <style>{`
        .bp-main {
          flex: 1;
          margin-left: 220px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          min-width: 0;
          width: calc(100% - 220px);
        }
        @media (max-width: 1024px) {
          .bp-main {
            margin-left: 0;
            width: 100%;
            padding-top: 56px;
            padding-bottom: 80px;
          }
        }
      `}</style>

      <Sidebar userName={userName} userEmail={userEmail} />

      <main className="bp-main">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-[#090A0B]/80 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Subscription & Licensing</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Manage business plan, statutory features, and platform quotas</p>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-lg border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'plans'
                  ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Plans & Privileges
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'faq'
                  ? 'bg-zinc-800 text-white shadow-sm border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Statutory FAQ
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6 max-w-6xl w-full mx-auto">
          {/* Status Overview Card */}
          <section className="bg-zinc-900/60 rounded-xl border border-white/[0.08] p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Early Adopter · Full Access
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Beta
                </span>
              </div>

              <div>
                <h2 className="text-base font-semibold text-white tracking-tight">
                  All Pro & Agency capabilities are unlocked for free
                </h2>
                <p className="text-xs text-zinc-400 max-w-xl leading-relaxed mt-1">
                  Enjoy unlimited GST tax invoicing, AI contract risk audits, camera receipt OCR, and direct 0% MDR UPI QR payments without subscription fees or credit card requirements.
                </p>
              </div>
            </div>

            {/* Quota Counters */}
            <div className="bg-zinc-950/60 border border-white/[0.08] rounded-lg p-3.5 min-w-[220px] flex flex-col gap-2">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Monthly Quotas
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">GST Invoices:</span>
                <span className="font-semibold text-emerald-400">Unlimited (∞)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Clients Managed:</span>
                <span className="font-semibold text-emerald-400">Unlimited (∞)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">AI Contract Audits:</span>
                <span className="font-semibold text-emerald-400">Full Access</span>
              </div>
            </div>
          </section>

          {activeTab === 'plans' && (
            <>
              {/* Early Access Notice Banner */}
              <div className="bg-gradient-to-r from-emerald-500/[0.08] via-zinc-900/60 to-blue-500/[0.06] border border-emerald-500/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">
                      Zero Fees
                    </span>
                    <span className="text-sm font-semibold text-white">Community Early Access Release</span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                    Settlr is built to solve late payments and compliance burdens for Indian independent professionals and MSMEs. All premium tools are 100% free while we onboard early users.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-auto">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  Active at ₹0
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Free Starter */}
                <div className="bg-zinc-900/40 rounded-xl border border-white/[0.08] p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Individual</div>
                      <h3 className="text-base font-semibold text-white mt-1">Starter</h3>
                      <p className="text-xs text-zinc-400 mt-1">For freelancers issuing occasional statutory bills.</p>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white tracking-tight">₹0</span>
                      <span className="text-xs text-zinc-400">/ forever</span>
                    </div>

                    <div className="h-px bg-white/[0.06] my-2" />

                    <ul className="space-y-2.5 text-xs text-zinc-300">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>GST Tax Invoicing & Credit Notes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Direct 0% MDR UPI QR Bank Settlement</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>MSMED Act 45-Day Statutory Tracker</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>WhatsApp & PDF Invoice Sharing</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <span className="w-full block text-center py-2 px-3 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-white/[0.08]">
                      Included in Platform
                    </span>
                  </div>
                </div>

                {/* Pro Growth (Featured) */}
                <div className="bg-zinc-900/80 rounded-xl border border-emerald-500/30 p-6 flex flex-col justify-between relative shadow-lg shadow-black/40">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Free During Beta
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Professional</div>
                      <h3 className="text-base font-semibold text-white mt-1 flex items-center gap-1.5">
                        <ZapIcon className="w-4 h-4 text-emerald-400" />
                        Pro Growth
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">Full financial and statutory system for contractors & MSMEs.</p>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white tracking-tight">₹0</span>
                      <span className="text-xs text-zinc-400 line-through">₹499/mo</span>
                      <span className="text-[11px] text-emerald-400 font-medium">Free Access</span>
                    </div>

                    <div className="h-px bg-white/[0.06] my-2" />

                    <ul className="space-y-2.5 text-xs text-zinc-200">
                      <li className="flex items-start gap-2 font-medium text-white">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Unlimited GST Invoices & Client Records</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>AI Contract Risk Redlines & Clause Audits</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>AI Mobile Receipt OCR Scanner</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>MSMED Act Section 16 Notice Generator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>One-Click GSTR-1 JSON & CA Audit Export</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-default"
                    >
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Unlocked & Active
                    </button>
                  </div>
                </div>

                {/* Agency Plan */}
                <div className="bg-zinc-900/40 rounded-xl border border-white/[0.08] p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">Enterprise</div>
                      <h3 className="text-base font-semibold text-white mt-1 flex items-center gap-1.5">
                        <BuildingIcon className="w-4 h-4 text-blue-400" />
                        Agency & Practice
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">Multi-client agencies, accounting firms, and CA practices.</p>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white tracking-tight">₹0</span>
                      <span className="text-xs text-zinc-400 line-through">₹1,499/mo</span>
                      <span className="text-[11px] text-blue-400 font-medium">Free Access</span>
                    </div>

                    <div className="h-px bg-white/[0.06] my-2" />

                    <ul className="space-y-2.5 text-xs text-zinc-300">
                      <li className="flex items-start gap-2 font-medium text-white">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Everything in Pro Included</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Multi-GSTIN & Multi-Branch Support</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Section 44ADA Presumptive Tax Planner</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Predictive Cashflow & DSO Radar</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-white/[0.08] cursor-default"
                    >
                      <CheckIcon className="w-3.5 h-3.5 text-blue-400" />
                      Unlocked & Active
                    </button>
                  </div>
                </div>
              </div>

              {/* Feature Matrix Table */}
              <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] overflow-hidden">
                <div className="p-5 border-b border-white/[0.08]">
                  <h3 className="text-sm font-semibold text-white">Feature Specifications</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Comprehensive capabilities comparison across tiers</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-zinc-950/40 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        <th className="py-3 px-5">Capability</th>
                        <th className="py-3 px-4 w-36">Starter</th>
                        <th className="py-3 px-4 w-40 text-emerald-400">Pro Growth</th>
                        <th className="py-3 px-4 w-40 text-blue-400">Agency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">Monthly GST Invoices</td>
                        <td className="py-3 px-4 text-zinc-400">5 / month</td>
                        <td className="py-3 px-4 font-semibold text-emerald-400">Unlimited (∞)</td>
                        <td className="py-3 px-4 font-semibold text-blue-400">Unlimited (∞)</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">Client Management</td>
                        <td className="py-3 px-4 text-zinc-400">5 Clients</td>
                        <td className="py-3 px-4 font-semibold text-emerald-400">Unlimited (∞)</td>
                        <td className="py-3 px-4 font-semibold text-blue-400">Unlimited (∞)</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">Direct NPCI UPI QR (0% MDR)</td>
                        <td className="py-3 px-4"><CheckIcon className="w-4 h-4 text-emerald-400" /></td>
                        <td className="py-3 px-4"><CheckIcon className="w-4 h-4 text-emerald-400" /></td>
                        <td className="py-3 px-4"><CheckIcon className="w-4 h-4 text-blue-400" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">MSMED Act 45-Day 3x Interest Engine</td>
                        <td className="py-3 px-4"><CheckIcon className="w-4 h-4 text-emerald-400" /></td>
                        <td className="py-3 px-4"><CheckIcon className="w-4 h-4 text-emerald-400" /></td>
                        <td className="py-3 px-4"><CheckIcon className="w-4 h-4 text-blue-400" /></td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">AI Contract Risk Audits & Redlines</td>
                        <td className="py-3 px-4"><CrossIcon className="w-4 h-4 text-zinc-600" /></td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">Included</td>
                        <td className="py-3 px-4 text-blue-400 font-medium">Included</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">AI Camera Receipt OCR Scanner</td>
                        <td className="py-3 px-4"><CrossIcon className="w-4 h-4 text-zinc-600" /></td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">Included</td>
                        <td className="py-3 px-4 text-blue-400 font-medium">Included</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 font-medium text-white">GSTR-1 JSON & CA Audit Export</td>
                        <td className="py-3 px-4 text-zinc-500">Basic</td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">Full JSON & CSV</td>
                        <td className="py-3 px-4 text-blue-400 font-medium">Full JSON & CSV</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'faq' && (
            <div className="bg-zinc-900/60 rounded-xl border border-white/[0.08] p-6 lg:p-8 space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white">Statutory & Licensing FAQ</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Details regarding compliance, UPI settlements, and public beta terms</p>
              </div>

              <div className="space-y-4 divide-y divide-white/[0.06]">
                <div className="pt-4 first:pt-0">
                  <h4 className="text-xs font-semibold text-emerald-400">Is Settlr really 100% free right now?</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Yes. During our public early access phase, every registered account receives complete access to all Pro and Agency tier tools with zero charges, subscription commitments, or credit card requirements.
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="text-xs font-semibold text-emerald-400">Why is Settlr offered at zero cost?</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Our initial priority is helping Indian freelancers and MSMEs resolve delayed payment challenges and automate GST statutory filings. We are building in public alongside our early users.
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="text-xs font-semibold text-emerald-400">Are gateway commissions deducted from invoice payments?</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    No. Settlr generates direct NPCI-compliant UPI QR codes linked to your registered UPI ID. When clients scan and pay using PhonePe, Google Pay, Paytm, or BHIM, 100% of the funds route directly into your bank account with ₹0 platform commission.
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="text-xs font-semibold text-emerald-400">What happens when paid subscriptions launch in the future?</h4>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Early beta community members will retain lifetime grandfathered benefits and receive advance notification prior to any commercial tier introductions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Native Zero-Fee UPI Payment Modal (Clean Production Standard) */}
      {upiModal && upiModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/[0.12] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                  <ShieldCheckIcon className="w-3.5 h-3.5" /> Direct Bank UPI
                </span>
                <h3 className="text-lg font-semibold text-white mt-2">
                  Upgrade to {upiModal.planId === 'agency' ? 'Agency License' : 'Pro Growth'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {upiModal.cycle === 'yearly' ? 'Annual Subscription' : 'Monthly Subscription'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpiModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <CrossIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-white/[0.08] rounded-lg p-3.5 flex justify-between items-center">
              <span className="text-xs text-zinc-400">Payable Amount</span>
              <span className="text-lg font-bold text-emerald-400 tabular-nums">
                {fmtINR(upiModal.amount)}
              </span>
            </div>

            {/* QR Scan Area */}
            <div className="text-center space-y-3">
              <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${encodeURIComponent(
                    `upi://pay?pa=${upiModal.merchantUpi}&pn=${encodeURIComponent(
                      upiModal.merchantName
                    )}&am=${upiModal.amount}&cu=INR&tn=${encodeURIComponent(
                      `Settlr-${upiModal.planId.toUpperCase()}-${upiModal.orderId.slice(-6)}`
                    )}`
                  )}`}
                  alt="Settlr UPI QR Code"
                  width={180}
                  height={180}
                  className="block rounded"
                />
              </div>

              <p className="text-xs text-zinc-400">
                Scan with Google Pay, PhonePe, Paytm, or BHIM
              </p>

              <div className="inline-flex items-center gap-2 bg-zinc-800/80 border border-white/[0.08] rounded-full px-3 py-1 text-xs text-zinc-300">
                <span className="text-zinc-500 font-mono">VPA:</span>
                <strong className="font-mono text-zinc-200">{upiModal.merchantUpi}</strong>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(upiModal.merchantUpi)
                    setCopiedUpi(true)
                    setTimeout(() => setCopiedUpi(false), 2000)
                  }}
                  className="text-xs text-emerald-400 font-medium ml-1 hover:underline flex items-center gap-1"
                >
                  <CopyIcon className="w-3 h-3 text-emerald-400" />
                  {copiedUpi ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div>
                <a
                  href={`upi://pay?pa=${upiModal.merchantUpi}&pn=${encodeURIComponent(
                    upiModal.merchantName
                  )}&am=${upiModal.amount}&cu=INR&tn=${encodeURIComponent(
                    `Settlr-${upiModal.planId.toUpperCase()}-${upiModal.orderId.slice(-6)}`
                  )}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <SmartphoneIcon className="w-3.5 h-3.5" />
                  Tap to launch UPI app directly on mobile
                </a>
              </div>
            </div>

            {/* UTR Verification Input */}
            <form onSubmit={handleVerifyUtr} className="pt-4 border-t border-white/[0.08] space-y-3">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                12-Digit Transaction Reference (UTR)
              </label>
              <input
                type="text"
                placeholder="e.g. 423456789012"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                maxLength={20}
                className={`w-full bg-zinc-950/80 border rounded-lg px-3.5 py-2 text-sm text-white font-mono tracking-wider outline-none transition-colors ${
                  utrError ? 'border-red-500/80 focus:border-red-500' : 'border-white/[0.12] focus:border-emerald-500/80'
                }`}
              />

              {utrError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{utrError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifyingUtr}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors shadow-sm"
              >
                {verifyingUtr ? 'Verifying Reference...' : 'Verify Reference & Activate'}
                <ArrowRightIcon className="w-3.5 h-3.5 text-black" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Celebratory Activation Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/[0.12] rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <SparklesIcon className="w-6 h-6 text-emerald-400" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">Settlr Pro License Active</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Your privileges have updated. Unlimited GST invoices, AI contract risk scoring, and camera receipt scanning are immediately ready.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false)
                router.push('/dashboard')
              }}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
            >
              Continue to Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
