'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ═══════════════════════════════════════════════════════════════
   CUSTOM HOOKS
   ═══════════════════════════════════════════════════════════════ */

// Scroll-triggered reveal using IntersectionObserver
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// Animated counter that triggers on scroll
function useScrollCounter(end: number, duration = 2000) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); obs.unobserve(el) } },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let start = 0
    const stepTime = 16
    const totalSteps = duration / stepTime
    const stepIncrement = end / totalSteps
    const timer = setInterval(() => {
      start += stepIncrement
      if (start >= end) { setValue(end); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, stepTime)
    return () => clearInterval(timer)
  }, [started, end, duration])

  return { ref, value }
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter()

  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<'msme' | 'gst' | 'upi' | 'ai' | 'tax'>('msme')
  const [calcAmount, setCalcAmount] = useState<number>(250000)
  const [calcDays, setCalcDays] = useState<number>(60)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Prefetch login page for instant navigation
  useEffect(() => { router.prefetch('/login') }, [router])

  // Scroll progress bar
  const [scrollProgress, setScrollProgress] = useState(0)

  // Parallax offset
  const [scrollY, setScrollY] = useState(0)

  // Typewriter effect for hero
  const [typewriterText, setTypewriterText] = useState('')
  const [typewriterDone, setTypewriterDone] = useState(false)
  const fullText = 'Claim Your 45-Day Statutory Rights.'

  // Scroll-triggered sections
  const heroSection = useInView(0.1)
  const showcaseSection = useInView(0.1)
  const howItWorksSection = useInView(0.1)
  const calcSection = useInView(0.1)
  const statsSection = useInView(0.15)
  const featuresSection = useInView(0.1)
  const compSection = useInView(0.1)
  const testimonialsSection = useInView(0.1)
  const faqSection = useInView(0.1)
  const ctaSection = useInView(0.1)

  // Stats counters (scroll-triggered)
  const stat1 = useScrollCounter(48500, 2200)
  const stat2 = useScrollCounter(9200, 2000)
  const stat3 = useScrollCounter(99, 1500)
  const stat4 = useScrollCounter(0, 1800)

  // Scroll handler for progress + parallax
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0)
      setScrollY(scrollTop)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Typewriter effect
  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setTypewriterText(fullText.slice(0, i + 1))
        i++
      } else {
        setTypewriterDone(true)
        clearInterval(timer)
      }
    }, 45)
    return () => clearInterval(timer)
  }, [])

  // Interactive MSMED Act Interest Calculation
  const interestResult = useMemo(() => {
    const overdueDays = Math.max(0, calcDays - 45)
    if (overdueDays <= 0) return { interest: 0, totalClaim: calcAmount, effectiveRate: '20.25%' }
    const monthlyRate = 0.2025 / 12
    const months = overdueDays / 30.4167
    const totalClaim = calcAmount * Math.pow(1 + monthlyRate, months)
    const interest = Math.max(0, totalClaim - calcAmount)
    return {
      interest: Math.round(interest),
      totalClaim: Math.round(totalClaim),
      effectiveRate: '20.25% (3x RBI Rate)',
      overdueDays,
    }
  }, [calcAmount, calcDays])

  const fmtINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)

  const faqs = [
    {
      q: 'What is the 45-Day MSMED Act 2006 rule and how does Settlr enforce it?',
      a: 'Under Sections 15 & 16 of the Micro, Small and Medium Enterprises Development (MSMED) Act 2006, buyers are legally mandated to pay MSME suppliers within 45 days. If delayed, buyers are statutory liable to pay compound monthly interest at 3 times the RBI bank rate (currently 20.25% p.a.). Settlr automatically tracks this deadline and generates legally admissible demand notices.'
    },
    {
      q: 'How does 0% MDR direct UPI QR settlement work?',
      a: 'Settlr dynamically encodes your UPI VPA, exact invoice amount, and invoice reference into an NPCI-compliant UPI QR code. Your clients scan with Google Pay, PhonePe, Paytm, or BHIM, and funds deposit directly into your bank account with zero payment gateway processing deductions.'
    },
    {
      q: 'Can I generate GSTR-1 and GSTR-3B tax reports with Settlr?',
      a: 'Yes! Settlr automatically calculates CGST, SGST, and IGST splits based on customer state codes, and lets you download a verified GSTR-1 JSON export ready for 1-click upload on the official GST portal.'
    },
    {
      q: 'How does Section 44ADA Presumptive Taxation calculation work?',
      a: 'If you are a professional, consultant, or agency with turnover up to ₹75 Lakhs, Section 44ADA lets you declare 50% of gross receipts as taxable income. Settlr calculates your quarterly advance tax liabilities (June 15, Sept 15, Dec 15, March 15) and offsets your deducted 194J/194C TDS.'
    },
    {
      q: 'Is Settlr completely free to use?',
      a: 'Yes! Settlr offers a comprehensive free tier for Indian freelancers, contractors, and MSMEs with unlimited GST invoicing, UPI QR generation, and MSME interest computation.'
    },
    {
      q: 'How does the AI contract redlining feature work?',
      a: 'Powered by Google Gemini 2.5 Flash, Settlr scans uploaded contracts for unfair indemnity clauses, missing MSMED Act late fee terms, uncapped liability risks, and non-compete overreach. It generates a contract risk score (0-100) and provides redline suggestions with specific clause rewrites.'
    },
  ]

  const howItWorks = [
    { step: '01', icon: '📝', title: 'Create Invoice', desc: 'Generate a professional GST-compliant invoice in under 60 seconds with auto-calculated CGST/SGST/IGST splits.' },
    { step: '02', icon: '⚡', title: 'Send & Track', desc: 'Share via WhatsApp/Email with embedded UPI QR. Real-time payment tracking with automatic 45-day MSMED deadline monitoring.' },
    { step: '03', icon: '🛡️', title: 'Auto-Enforce', desc: 'If payment crosses 45 days, Settlr auto-generates compound interest notices and MSME Samadhaan filing documents.' },
    { step: '04', icon: '📊', title: 'File & Grow', desc: 'Export GSTR-1 JSON, track advance tax, reconcile TDS, and forecast 90-day cashflow — all from one dashboard.' },
  ]

  const testimonials = [
    { name: 'Vijay Kumar S.', role: 'Founder, HITECH Digital Agency', city: 'Hyderabad', initials: 'VK', quote: 'Settlr saved us ₹4.5L in overdue client payments using 45-day MSME statutory claims. The automated legal notices did what months of follow-up calls couldn\'t.', metric: '₹4.5L Recovered' },
    { name: 'Priya Deshmukh', role: 'Freelance UI/UX Designer', city: 'Pune', initials: 'PD', quote: 'The zero-MDR UPI QR on every invoice is a game changer. No more losing 2% to Razorpay. Clients pay instantly by scanning with GPay.', metric: '₹0 Gateway Fees' },
    { name: 'Ravi Shankar M.', role: 'IT Consultant & Contractor', city: 'Bengaluru', initials: 'RS', quote: 'GSTR-1 JSON export alone saves me 5 hours monthly. The 44ADA advance tax planner catches my quarterly deadlines every time.', metric: '20hrs/mo Saved' },
    { name: 'Ananya Krishnan', role: 'Chartered Accountant', city: 'Chennai', initials: 'AK', quote: 'I recommend Settlr to all my MSME clients. The TDS ledger reconciliation with Form 26AS is incredibly accurate. Best free tool in India.', metric: '150+ Clients' },
  ]

  // Staggered animation helper
  const stagger = (idx: number) => ({ transitionDelay: `${idx * 120}ms` })

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background-color: #060A08;
          color: #F3F4F6;
          font-family: 'DM Sans', sans-serif;
          overflow-x: hidden;
          line-height: 1.5;
        }

        /* ── SCROLL PROGRESS BAR ── */
        .scroll-progress {
          position: fixed; top: 0; left: 0; height: 3px; z-index: 9999;
          background: linear-gradient(90deg, #10B981 0%, #34D399 40%, #F59E0B 100%);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
          transition: width 0.1s linear;
        }

        /* ── AMBIENT GLOW EFFECTS (Parallax) ── */
        .glow-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
        }
        .glow-orb-1 {
          position: absolute; top: -150px; left: 15%; width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 65%);
          filter: blur(80px); animation: floatOrb 14s infinite alternate ease-in-out;
        }
        .glow-orb-2 {
          position: absolute; top: 40%; right: -100px; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, transparent 65%);
          filter: blur(90px); animation: floatOrb 18s infinite alternate-reverse ease-in-out;
        }
        .glow-orb-3 {
          position: absolute; bottom: 10%; left: 10%; width: 550px; height: 550px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 65%);
          filter: blur(80px);
        }

        /* ── PARALLAX FLOATING SHAPES ── */
        .parallax-shapes {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
        }
        .pshape {
          position: absolute; border-radius: 50%; opacity: 0.04;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .pshape-1 { width: 300px; height: 300px; top: 20%; right: 5%; }
        .pshape-2 { width: 200px; height: 200px; top: 50%; left: 3%; }
        .pshape-3 { width: 150px; height: 150px; top: 75%; right: 15%; border-color: rgba(245,158,11,0.3); }
        .pshape-sq { border-radius: 16px; transform: rotate(45deg); }

        @keyframes floatOrb {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(40px) scale(1.08); }
        }

        /* ── REVEAL ANIMATION CLASSES ── */
        .reveal {
          opacity: 0; transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.visible { opacity: 1; transform: translateY(0); }

        .reveal-left {
          opacity: 0; transform: translateX(-50px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-left.visible { opacity: 1; transform: translateX(0); }

        .reveal-right {
          opacity: 0; transform: translateX(50px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-right.visible { opacity: 1; transform: translateX(0); }

        .reveal-scale {
          opacity: 0; transform: scale(0.9);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-scale.visible { opacity: 1; transform: scale(1); }

        /* ── TOP NAVIGATION ── */
        .navbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(6, 10, 8, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          transition: all 0.3s ease;
        }
        .navbar.scrolled {
          background: rgba(6, 10, 8, 0.92);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .nav-inner {
          max-width: 1240px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px;
        }
        .brand {
          display: flex; align-items: center; gap: 12px; text-decoration: none;
        }
        .brand-logo {
          width: 36px; height: 36px; border-radius: 10px; overflow: hidden;
          background: #10B981; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.4);
        }
        .brand-logo img { width: 100%; height: 100%; object-fit: cover; }
        .brand-title {
          font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #FFFFFF;
          letter-spacing: -0.02em; line-height: 1;
        }
        .brand-badge {
          font-size: 9px; font-weight: 700; color: #34D399; background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 100px; padding: 2px 7px;
          margin-left: 6px; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .nav-links {
          display: flex; align-items: center; gap: 28px;
        }
        .nav-link {
          font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.7);
          text-decoration: none; transition: color 0.2s ease;
          position: relative;
        }
        .nav-link::after {
          content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px;
          background: #10B981; border-radius: 2px; transition: width 0.3s ease;
        }
        .nav-link:hover { color: #34D399; }
        .nav-link:hover::after { width: 100%; }
        .nav-actions { display: flex; align-items: center; gap: 14px; }
        .btn-ghost {
          font-size: 13px; font-weight: 600; color: #FFFFFF; text-decoration: none;
          padding: 8px 16px; border-radius: 8px; transition: all 0.2s;
        }
        .btn-ghost:hover { background: rgba(255, 255, 255, 0.06); }
        .btn-glow {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white; text-decoration: none; font-size: 13px; font-weight: 700;
          padding: 9px 20px; border-radius: 10px;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
        }
        .btn-glow::after {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: linear-gradient(60deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: rotate(30deg); animation: btnShimmer 4s infinite;
        }
        @keyframes btnShimmer {
          0% { transform: translate(-100%, -100%) rotate(30deg); }
          100% { transform: translate(100%, 100%) rotate(30deg); }
        }
        .btn-glow:hover {
          transform: translateY(-2px); box-shadow: 0 0 28px rgba(16, 185, 129, 0.55);
        }

        /* ── HERO SECTION ── */
        .hero {
          position: relative; z-index: 1; padding: 160px 24px 80px;
          max-width: 1240px; margin: 0 auto; text-align: center;
        }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 100px; padding: 6px 16px; font-size: 12px; font-weight: 600;
          color: #34D399; margin-bottom: 24px; box-shadow: 0 0 16px rgba(16, 185, 129, 0.1);
          animation: fadeInDown 0.8s ease-out;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pulse-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #10B981;
          box-shadow: 0 0 8px #10B981; animation: pulseGlow 2s infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .hero-title {
          font-family: 'Outfit', sans-serif; font-size: clamp(36px, 5.2vw, 68px);
          font-weight: 900; line-height: 1.08; letter-spacing: -0.035em; color: #FFFFFF;
          max-width: 980px; margin: 0 auto 20px;
          animation: fadeInUp 0.8s 0.2s ease-out both;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-gradient {
          background: linear-gradient(135deg, #34D399 0%, #10B981 50%, #F59E0B 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .typewriter-cursor {
          display: inline-block; width: 3px; height: 0.9em; background: #34D399;
          margin-left: 4px; vertical-align: text-bottom;
          animation: blink 0.7s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        .hero-subtitle {
          font-size: clamp(15px, 1.8vw, 18px); color: rgba(255, 255, 255, 0.65);
          max-width: 760px; margin: 0 auto 36px; line-height: 1.65; font-weight: 400;
          animation: fadeInUp 0.8s 0.5s ease-out both;
        }
        .hero-buttons {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          flex-wrap: wrap; margin-bottom: 48px;
          animation: fadeInUp 0.8s 0.7s ease-out both;
        }
        .btn-large {
          font-size: 15px; padding: 14px 28px; border-radius: 12px;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12);
          color: white; text-decoration: none; font-size: 14px; font-weight: 600;
          padding: 13px 24px; border-radius: 12px; transition: all 0.2s;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); transform: translateY(-2px); }

        /* Trust Badges */
        .trust-row {
          display: flex; align-items: center; justify-content: center; gap: 32px;
          flex-wrap: wrap; opacity: 0.8; margin-top: 20px; font-size: 12px; font-weight: 500;
          color: rgba(255, 255, 255, 0.5);
          animation: fadeInUp 0.8s 0.9s ease-out both;
        }
        .trust-item {
          display: flex; align-items: center; gap: 8px;
          transition: all 0.3s ease;
        }
        .trust-item:hover { color: rgba(255, 255, 255, 0.8); transform: translateY(-2px); }

        /* ── INTERACTIVE APP SHOWCASE ── */
        .showcase {
          position: relative; z-index: 1; max-width: 1180px; margin: 40px auto 100px;
          padding: 0 24px;
        }
        .showcase-card {
          background: rgba(12, 20, 15, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.1);
        }
        .showcase-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(6, 10, 8, 0.5); flex-wrap: wrap; gap: 12px;
        }
        .showcase-tabs {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .tab-btn {
          padding: 7px 16px; border-radius: 8px; border: 1px solid transparent;
          font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.25s; background: transparent; color: rgba(255, 255, 255, 0.6);
        }
        .tab-btn:hover { background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.8); }
        .tab-btn.active {
          background: rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.4);
          color: #34D399; box-shadow: 0 0 12px rgba(16, 185, 129, 0.2);
        }
        .showcase-body {
          padding: 32px; min-height: 420px; display: flex; flex-direction: column; justify-content: center;
        }

        /* Showcase Preview Views */
        .preview-grid {
          display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; align-items: center;
          animation: fadeInUp 0.5s ease-out;
        }
        .preview-left { display: flex; flex-direction: column; gap: 16px; }
        .preview-right {
          background: rgba(6, 10, 8, 0.8); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px; padding: 24px; position: relative;
        }

        /* ── HOW IT WORKS SECTION ── */
        .hiw-section {
          position: relative; z-index: 1; max-width: 1100px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .hiw-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
          position: relative;
        }
        .hiw-connector {
          position: absolute; top: 44px; left: 12.5%; right: 12.5%; height: 2px; z-index: 0;
          background: linear-gradient(90deg, #10B981 0%, #059669 33%, #10B981 66%, #34D399 100%);
          opacity: 0.3;
        }
        .hiw-connector::after {
          content: ''; position: absolute; top: 0; left: 0; height: 100%;
          background: linear-gradient(90deg, #10B981, #34D399);
          animation: connectorFill 2s ease-out forwards;
          width: 0;
        }
        .hiw-connector.visible::after { width: 100%; }
        .hiw-card {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 0 16px; position: relative; z-index: 1;
        }
        .hiw-num {
          width: 88px; height: 88px; border-radius: 50%;
          background: rgba(16, 185, 129, 0.08); border: 2px solid rgba(16, 185, 129, 0.3);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          margin-bottom: 20px; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hiw-card:hover .hiw-num {
          transform: scale(1.1); background: rgba(16, 185, 129, 0.15);
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.3);
          border-color: rgba(16, 185, 129, 0.6);
        }
        .hiw-icon { font-size: 28px; line-height: 1; }
        .hiw-step {
          font-size: 9px; font-weight: 800; color: #34D399; letter-spacing: 0.12em;
          text-transform: uppercase; margin-top: 4px;
        }
        .hiw-title {
          font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700;
          color: #FFFFFF; margin-bottom: 8px;
        }
        .hiw-desc {
          font-size: 13px; color: rgba(255, 255, 255, 0.6); line-height: 1.55;
        }
        @keyframes connectorFill {
          from { width: 0; }
          to { width: 100%; }
        }

        /* ── STATS SECTION ── */
        .stats-section {
          position: relative; z-index: 1; max-width: 1100px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .stats-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
        }
        .stat-card {
          background: rgba(14, 24, 18, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px; padding: 28px 24px; text-align: center;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, #10B981, transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .stat-card:hover::before { opacity: 1; }
        .stat-card:hover {
          transform: translateY(-6px); border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.1);
        }
        .stat-value {
          font-family: 'Outfit', sans-serif; font-size: 42px; font-weight: 900;
          color: #34D399; line-height: 1; margin-bottom: 6px;
          background: linear-gradient(135deg, #34D399, #10B981);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.65);
        }
        .stat-icon { font-size: 24px; margin-bottom: 12px; display: block; }

        /* ── STATUTORY CALCULATOR SECTION ── */
        .calc-section {
          position: relative; z-index: 1; max-width: 1100px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .calc-box {
          background: linear-gradient(145deg, rgba(16, 28, 20, 0.85), rgba(8, 14, 10, 0.95));
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 24px; padding: 48px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.1);
        }
        .calc-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;
        }
        .slider-wrap { margin-bottom: 24px; }
        .slider-label {
          display: flex; justify-content: space-between; font-size: 13px; font-weight: 600;
          color: rgba(255, 255, 255, 0.8); margin-bottom: 8px;
        }
        .slider-val { color: #34D399; font-weight: 700; font-family: 'Outfit', sans-serif; font-size: 16px; }
        .custom-slider {
          width: 100%; -webkit-appearance: none; height: 6px; border-radius: 6px;
          background: rgba(255, 255, 255, 0.1); outline: none; transition: background 0.2s;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: #10B981; cursor: pointer; box-shadow: 0 0 10px #10B981;
          transition: all 0.2s;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2); box-shadow: 0 0 18px #10B981;
        }
        .calc-result-card {
          background: rgba(6, 10, 8, 0.9); border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 18px; padding: 32px; text-align: center;
        }
        .calc-highlight {
          font-family: 'Outfit', sans-serif; font-size: 38px; font-weight: 900;
          color: #34D399; line-height: 1; margin: 12px 0 6px;
        }

        /* ── FEATURE PILLARS GRID ── */
        .features-section {
          position: relative; z-index: 1; max-width: 1240px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .section-header { text-align: center; margin-bottom: 60px; }
        .section-tag {
          font-size: 11px; font-weight: 700; color: #34D399; text-transform: uppercase;
          letter-spacing: 0.12em; margin-bottom: 10px; display: block;
        }
        .section-title {
          font-family: 'Outfit', sans-serif; font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 800; color: #FFFFFF; letter-spacing: -0.025em; line-height: 1.15;
        }
        .section-subtitle {
          font-size: 16px; color: rgba(255, 255, 255, 0.55); max-width: 600px;
          margin: 12px auto 0; line-height: 1.6;
        }
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
        }
        .feat-card {
          background: rgba(14, 24, 18, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px; padding: 32px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .feat-card:hover {
          transform: translateY(-6px);
          border-color: rgba(16, 185, 129, 0.4);
          background: rgba(18, 32, 24, 0.8);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 25px rgba(16, 185, 129, 0.15);
        }
        .feat-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex; align-items: center; justify-content: center; font-size: 22px;
          margin-bottom: 20px; transition: all 0.3s;
        }
        .feat-card:hover .feat-icon {
          transform: scale(1.1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
        }
        .feat-title {
          font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 700;
          color: #FFFFFF; margin-bottom: 10px;
        }
        .feat-desc {
          font-size: 13px; color: rgba(255, 255, 255, 0.65); line-height: 1.6;
        }

        /* ── COMPARISON MATRIX ── */
        .comp-section {
          position: relative; z-index: 1; max-width: 1100px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .comp-table {
          width: 100%; border-collapse: separate; border-spacing: 0;
          background: rgba(12, 20, 15, 0.7); border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px; overflow: hidden;
        }
        .comp-table th, .comp-table td {
          padding: 16px 20px; text-align: left; font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .comp-table th {
          background: rgba(6, 10, 8, 0.8); font-family: 'Outfit', sans-serif;
          font-weight: 700; color: rgba(255, 255, 255, 0.9); font-size: 14px;
        }
        .col-settlr {
          background: rgba(16, 185, 129, 0.08); border-left: 1px solid rgba(16, 185, 129, 0.2);
          border-right: 1px solid rgba(16, 185, 129, 0.2); font-weight: 600; color: #34D399;
        }

        /* ── TESTIMONIALS ── */
        .testi-section {
          position: relative; z-index: 1; max-width: 1240px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .testi-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
        }
        .testi-card {
          background: rgba(14, 24, 18, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px; padding: 28px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .testi-card:hover {
          transform: translateY(-4px); border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3), 0 0 18px rgba(16, 185, 129, 0.1);
        }
        .testi-stars { color: #F59E0B; font-size: 14px; margin-bottom: 12px; letter-spacing: 2px; }
        .testi-quote {
          font-size: 14px; color: rgba(255, 255, 255, 0.8); line-height: 1.65;
          font-style: italic; margin-bottom: 20px; flex: 1;
        }
        .testi-footer { display: flex; justify-content: space-between; align-items: center; }
        .testi-author { display: flex; align-items: center; gap: 12px; }
        .testi-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #10B981, #059669);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; color: white;
          flex-shrink: 0;
        }
        .testi-name-text { font-size: 14px; font-weight: 700; color: #FFFFFF; }
        .testi-role-text { font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 2px; }
        .testi-metric {
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 800; color: #34D399;
          background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 5px 12px; border-radius: 8px; white-space: nowrap;
        }

        /* ── FAQ ACCORDION ── */
        .faq-section {
          position: relative; z-index: 1; max-width: 860px; margin: 0 auto 120px;
          padding: 0 24px;
        }
        .faq-item {
          background: rgba(14, 24, 18, 0.6); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px; margin-bottom: 12px; overflow: hidden; transition: all 0.25s;
        }
        .faq-item:hover { border-color: rgba(16, 185, 129, 0.2); }
        .faq-item.open { border-color: rgba(16, 185, 129, 0.3); background: rgba(18, 32, 24, 0.6); }
        .faq-q {
          padding: 20px 24px; font-weight: 600; font-size: 15px; color: #FFFFFF;
          display: flex; justify-content: space-between; align-items: center; cursor: pointer;
          transition: color 0.2s;
        }
        .faq-q:hover { color: #34D399; }
        .faq-a {
          padding: 0 24px 20px; font-size: 14px; color: rgba(255, 255, 255, 0.65); line-height: 1.6;
          animation: faqReveal 0.3s ease-out;
        }
        @keyframes faqReveal {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── BOTTOM CTA BANNER ── */
        .cta-banner {
          position: relative; z-index: 1; max-width: 1100px; margin: 0 auto 100px;
          padding: 0 24px; text-align: center;
        }
        .cta-card {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%);
          border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 28px; padding: 64px 32px;
          box-shadow: 0 0 60px rgba(16, 185, 129, 0.2);
          position: relative; overflow: hidden;
        }
        .cta-card::before {
          content: ''; position: absolute; inset: -2px; border-radius: 30px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.4), transparent, rgba(245, 158, 11, 0.2));
          z-index: -1; animation: ctaRotate 6s linear infinite;
        }
        @keyframes ctaRotate {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }

        /* ── FOOTER ── */
        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 48px 24px 32px;
          background: #040705; position: relative; z-index: 1;
        }
        .footer-inner {
          max-width: 1240px; margin: 0 auto; display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 24px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .nav-links { display: none; }
          .features-grid { grid-template-columns: 1fr; }
          .calc-grid { grid-template-columns: 1fr; gap: 32px; }
          .preview-grid { grid-template-columns: 1fr; }
          .calc-box { padding: 28px; }
          .hiw-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .hiw-connector { display: none; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .testi-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .hiw-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: 1fr; }
          .hero { padding: 120px 16px 60px; }
        }
      `}</style>

      {/* Scroll Progress Bar */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Background Ambient Glows */}
      <div className="glow-bg">
        <div className="glow-orb-1" style={{ transform: `translateY(${scrollY * 0.05}px)` }} />
        <div className="glow-orb-2" style={{ transform: `translateY(${scrollY * -0.03}px)` }} />
        <div className="glow-orb-3" style={{ transform: `translateY(${scrollY * 0.04}px)` }} />
      </div>

      {/* Parallax Floating Shapes */}
      <div className="parallax-shapes">
        <div className="pshape pshape-1" style={{ transform: `translateY(${scrollY * -0.08}px)` }} />
        <div className="pshape pshape-2 pshape-sq" style={{ transform: `rotate(45deg) translateY(${scrollY * 0.06}px)` }} />
        <div className="pshape pshape-3" style={{ transform: `translateY(${scrollY * -0.04}px)` }} />
      </div>

      {/* ── TOP NAVIGATION ── */}
      <nav className={`navbar ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Link href="/" className="brand">
            <div className="brand-logo">
              <img src="/settlr-logo.png" alt="Settlr Logo" />
            </div>
            <div>
              <span className="brand-title">Settlr</span>
              <span className="brand-badge">MSME OS</span>
            </div>
          </Link>

          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#calculator" className="nav-link">MSME Calculator</a>
            <a href="#testimonials" className="nav-link">Testimonials</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </div>

          <div className="nav-actions">
            <Link href="/login" className="btn-ghost">Sign In</Link>
            <Link href="/login" className="btn-glow">
              Launch App →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="hero" ref={heroSection.ref}>
        <div className="hero-pill">
          <span className="pulse-dot" />
          <span>India&apos;s #1 MSME Financial Operating System</span>
        </div>

        <h1 className="hero-title">
          Stop Chasing Overdue Invoices. <br />
          <span className="hero-gradient">
            {typewriterText}
            {!typewriterDone && <span className="typewriter-cursor" />}
          </span>
        </h1>

        <p className="hero-subtitle">
          The all-in-one financial operating system purpose-built for Indian freelancers, contractors, and MSMEs. Automated GST Invoicing, <strong>Section 16 MSMED Act compound interest notices @ 20.25%</strong>, 0% MDR direct UPI settlements, and AI contract risk redlining.
        </p>

        <div className="hero-buttons">
          <Link href="/login" className="btn-glow btn-large">
            Get Started Free (Zero Cost) →
          </Link>
          <a href="#calculator" className="btn-secondary">
            ⚡ Calculate MSME Late Interest
          </a>
        </div>

        <div className="trust-row">
          <div className="trust-item">🛡️ MSMED Act 2006 Compliant</div>
          <div className="trust-item">🧾 GST & GSTR-1 JSON Export Ready</div>
          <div className="trust-item">⚡ 0% MDR Direct NPCI UPI</div>
          <div className="trust-item">🔒 End-to-End Encrypted</div>
        </div>
      </header>

      {/* ── INTERACTIVE PRODUCT SHOWCASE ── */}
      <section className="showcase" id="features" ref={showcaseSection.ref}>
        <div className={`reveal-scale ${showcaseSection.visible ? 'visible' : ''}`}>
          <div className="showcase-card">
            <div className="showcase-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 8, fontWeight: 600 }}>
                  settlr-os // interactive-preview
                </span>
              </div>

              <div className="showcase-tabs">
                <button className={`tab-btn ${activeTab === 'msme' ? 'active' : ''}`} onClick={() => setActiveTab('msme')}>
                  🛡️ 45-Day MSMED Shield
                </button>
                <button className={`tab-btn ${activeTab === 'gst' ? 'active' : ''}`} onClick={() => setActiveTab('gst')}>
                  🧾 Smart GST Invoicing
                </button>
                <button className={`tab-btn ${activeTab === 'upi' ? 'active' : ''}`} onClick={() => setActiveTab('upi')}>
                  💳 Direct UPI QR
                </button>
                <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
                  🤖 AI Contract Analyzer
                </button>
                <button className={`tab-btn ${activeTab === 'tax' ? 'active' : ''}`} onClick={() => setActiveTab('tax')}>
                  📊 Advance Tax Planner
                </button>
              </div>
            </div>

            <div className="showcase-body">
              {activeTab === 'msme' && (
                <div className="preview-grid">
                  <div className="preview-left">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Statutory Protection Engine
                    </div>
                    <h3 style={{ fontFamily: 'Outfit', fontSize: 26, fontWeight: 800, color: '#FFF' }}>
                      Automated Section 15 & 16 Statutory Demand Notices
                    </h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      When clients cross the mandatory 45-day statutory credit limit, Settlr automatically computes compound monthly interest @ 20.25% p.a. (3x RBI Bank Rate) and generates downloadable MSME Samadhaan legal demand notices.
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#34D399' }}>20.25% p.a.</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Compound Monthly Rate</div>
                      </div>
                      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B' }}>45 Days</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Statutory Credit Window</div>
                      </div>
                    </div>
                  </div>

                  <div className="preview-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>MSME Statutory Notice #SN-842</span>
                      <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600 }}>OVERDUE (62 Days)</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                      Principal Invoice Total: <strong style={{ color: '#FFF' }}>₹1,50,000</strong>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                      Statutory Interest (17 Overdue Days): <strong style={{ color: '#34D399' }}>₹1,442</strong>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 12, fontSize: 12, color: '#A7F3D0' }}>
                      ⚖️ <em>&ldquo;Notice served under Section 16 of MSMED Act, 2006. Failure to clear within 7 days will be reported to the MSME Facilitation Council.&rdquo;</em>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'gst' && (
                <div className="preview-grid">
                  <div className="preview-left">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tax & Compliance</div>
                    <h3 style={{ fontFamily: 'Outfit', fontSize: 26, fontWeight: 800, color: '#FFF' }}>Smart Intra/Inter-State GST & Credit Notes</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      Automatic CGST (9%) + SGST (9%) for intra-state billing or IGST (18%) for inter-state clients. Export official GSTR-1 JSON summaries ready for CA reconciliation.
                    </p>
                  </div>
                  <div className="preview-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>Tax Invoice · INV-2026-004</span>
                      <span style={{ fontSize: 11, color: '#34D399', background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: 6 }}>GST COMPLIANT</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 10 }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 6 }}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Taxable Value</div>
                        <div style={{ fontWeight: 700, color: '#FFF' }}>₹1,00,000</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 6 }}>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>CGST + SGST (18%)</div>
                        <div style={{ fontWeight: 700, color: '#34D399' }}>₹18,000</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, fontSize: 13, fontWeight: 800, color: '#FFF' }}>
                      <span>Total Amount</span>
                      <span style={{ color: '#34D399' }}>₹1,18,000</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'upi' && (
                <div className="preview-grid">
                  <div className="preview-left">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Zero MDR Settlements</div>
                    <h3 style={{ fontFamily: 'Outfit', fontSize: 26, fontWeight: 800, color: '#FFF' }}>Direct-To-Bank NPCI Dynamic UPI QR Codes</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      No more waiting 2-3 days or losing 2% on payment gateway fees. Clients scan and pay directly via GPay, PhonePe, Paytm, or BHIM.
                    </p>
                  </div>
                  <div className="preview-right" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>⚡ 1-Tap UPI Settlement</div>
                    <div style={{ width: 120, height: 120, background: '#FFF', borderRadius: 12, margin: '0 auto 12px', padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '100%', height: '100%', border: '2px dashed #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#047857', fontWeight: 800 }}>
                        NPCI UPI QR
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Google Pay · PhonePe · Paytm · BHIM</div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="preview-grid">
                  <div className="preview-left">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Legal Intelligence</div>
                    <h3 style={{ fontFamily: 'Outfit', fontSize: 26, fontWeight: 800, color: '#FFF' }}>Gemini 2.5 Flash Contract Risk Redlining</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      Upload vendor agreements or client NDAs. Settlr instantly highlights unfair indemnity clauses, missing MSMED late fee terms, and unconstrained liability risks.
                    </p>
                  </div>
                  <div className="preview-right">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>Contract Score: 92/100</span>
                      <span style={{ fontSize: 11, color: '#34D399', fontWeight: 700 }}>HIGH PROTECTION</span>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 10, fontSize: 11, color: '#FCA5A5', marginBottom: 8 }}>
                      ⚠️ <strong>Uncapped Liability Risk:</strong> Section 8.2 exposes freelancer to unlimited damages.
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 10, fontSize: 11, color: '#A7F3D0' }}>
                      ✅ <strong>Proposed Redline:</strong> &ldquo;Liability shall be capped at 100% of total fees paid.&rdquo;
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="preview-grid">
                  <div className="preview-left">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Presumptive Taxation</div>
                    <h3 style={{ fontFamily: 'Outfit', fontSize: 26, fontWeight: 800, color: '#FFF' }}>Section 44ADA & Advance Tax Quarterly Tracker</h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      Automatic 50% profit margin calculation for Indian professionals. Real-time Form 26AS TDS 194J/194C offset tracking across all 4 statutory advance tax deadlines.
                    </p>
                  </div>
                  <div className="preview-right">
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>FY 2025-26 Advance Tax Schedule</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 6 }}>
                        <span>Q1 (June 15 - 15%)</span>
                        <span style={{ color: '#10B981', fontWeight: 700 }}>PAID ✓</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 6 }}>
                        <span>Q2 (Sept 15 - 45%)</span>
                        <span style={{ color: '#F59E0B', fontWeight: 700 }}>DUE SOON ⚠️</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 6 }}>
                        <span>Form 26AS TDS Offset</span>
                        <span style={{ color: '#34D399', fontWeight: 700 }}>- ₹24,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="hiw-section" id="how-it-works" ref={howItWorksSection.ref}>
        <div className={`reveal ${howItWorksSection.visible ? 'visible' : ''}`}>
          <div className="section-header">
            <span className="section-tag">Simple 4-Step Workflow</span>
            <h2 className="section-title">How Settlr Works</h2>
            <p className="section-subtitle">From invoice creation to statutory enforcement — fully automated in under 60 seconds.</p>
          </div>
        </div>

        <div className="hiw-grid">
          <div className={`hiw-connector ${howItWorksSection.visible ? 'visible' : ''}`} />
          {howItWorks.map((item, idx) => (
            <div
              key={idx}
              className={`hiw-card reveal ${howItWorksSection.visible ? 'visible' : ''}`}
              style={stagger(idx)}
            >
              <div className="hiw-num">
                <span className="hiw-icon">{item.icon}</span>
                <span className="hiw-step">Step {item.step}</span>
              </div>
              <h3 className="hiw-title">{item.title}</h3>
              <p className="hiw-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS COUNTER SECTION ── */}
      <section className="stats-section" ref={statsSection.ref}>
        <div className={`reveal ${statsSection.visible ? 'visible' : ''}`}>
          <div className="section-header">
            <span className="section-tag">Trusted by MSMEs Across India</span>
            <h2 className="section-title">Built for Scale, Proven in Practice</h2>
          </div>
        </div>

        <div className="stats-grid">
          <div className={`stat-card reveal ${statsSection.visible ? 'visible' : ''}`} ref={stat1.ref} style={stagger(0)}>
            <span className="stat-icon">💰</span>
            <div className="stat-value">₹{(stat1.value / 100).toFixed(0)}L+</div>
            <div className="stat-label">Overdue Amount Recovered</div>
          </div>
          <div className={`stat-card reveal ${statsSection.visible ? 'visible' : ''}`} ref={stat2.ref} style={stagger(1)}>
            <span className="stat-icon">🧾</span>
            <div className="stat-value">{stat2.value.toLocaleString('en-IN')}+</div>
            <div className="stat-label">GST Invoices Generated</div>
          </div>
          <div className={`stat-card reveal ${statsSection.visible ? 'visible' : ''}`} ref={stat3.ref} style={stagger(2)}>
            <span className="stat-icon">⚡</span>
            <div className="stat-value">{stat3.value}%</div>
            <div className="stat-label">UPI Payment Success Rate</div>
          </div>
          <div className={`stat-card reveal ${statsSection.visible ? 'visible' : ''}`} style={stagger(3)}>
            <span className="stat-icon">🆓</span>
            <div className="stat-value">₹0</div>
            <div className="stat-label">Platform Cost — Free Forever</div>
          </div>
        </div>
      </section>

      {/* ── STATUTORY MSME CALCULATOR ── */}
      <section className="calc-section" id="calculator" ref={calcSection.ref}>
        <div className={`reveal ${calcSection.visible ? 'visible' : ''}`}>
          <div className="calc-box">
            <div className="calc-grid">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  Live Statutory Calculator
                </div>
                <h2 style={{ fontFamily: 'Outfit', fontSize: 32, fontWeight: 800, color: '#FFF', lineHeight: 1.2, marginBottom: 16 }}>
                  How Much Late Fee Can You Legally Claim?
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 28 }}>
                  Drag the sliders below to calculate your statutory compound interest under Section 16 of the MSMED Act, 2006.
                </p>

                <div className="slider-wrap">
                  <div className="slider-label">
                    <span>Overdue Principal Amount</span>
                    <span className="slider-val">{fmtINR(calcAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min="25000"
                    max="2000000"
                    step="25000"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>

                <div className="slider-wrap">
                  <div className="slider-label">
                    <span>Days Since Invoice Issue Date</span>
                    <span className="slider-val">{calcDays} Days {calcDays > 45 ? `(${calcDays - 45} Overdue)` : '(Within 45-day window)'}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={calcDays}
                    onChange={(e) => setCalcDays(Number(e.target.value))}
                    className="custom-slider"
                  />
                </div>
              </div>

              <div className="calc-result-card">
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                  Total Statutory Claim Amount
                </div>
                <div className="calc-highlight">
                  {fmtINR(interestResult.totalClaim)}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
                  Includes <strong style={{ color: '#34D399' }}>{fmtINR(interestResult.interest)}</strong> in 20.25% compound statutory interest.
                </div>

                <Link href="/login" className="btn-glow" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}>
                  Generate MSME Legal Notice Now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 CORE PILLARS ── */}
      <section className="features-section" ref={featuresSection.ref}>
        <div className={`reveal ${featuresSection.visible ? 'visible' : ''}`}>
          <div className="section-header">
            <span className="section-tag">Complete Financial OS</span>
            <h2 className="section-title">Engineered Specifically For Indian MSMEs</h2>
            <p className="section-subtitle">Every tool you need to invoice, collect, comply, and grow — all in one integrated platform.</p>
          </div>
        </div>

        <div className="features-grid">
          {[
            { icon: '🛡️', title: '45-Day Statutory Enforcement', desc: 'Enforce your legal rights under Section 15 & 16 of the MSMED Act 2006. Automatically calculate 20.25% compound monthly interest and generate legal demand notices.' },
            { icon: '💳', title: 'Zero-MDR Direct UPI Payments', desc: 'Embedded dynamic NPCI UPI QR codes directly on invoices. Instant bank settlements via GPay/PhonePe with 0% payment gateway processing fees.' },
            { icon: '🧾', title: 'GST & Proforma Invoicing', desc: 'Full support for Intra-State CGST/SGST, Inter-State IGST, and GST Credit Notes. Instant GSTR-1 JSON export for hassle-free tax filing.' },
            { icon: '📊', title: 'TDS Ledger & Form 26AS Matcher', desc: 'Track 10%/2% Section 194J and 1% Section 194C tax withholdings. Auto-generate WhatsApp reminders for Form 16A certificates.' },
            { icon: '🤖', title: 'AI Contract Legal Redlining', desc: 'Powered by Google Gemini 2.5 Flash. Upload client contracts to instantly detect missing MSME clauses, payment risks, and uncapped liabilities.' },
            { icon: '📈', title: '90-Day Cashflow & DSO Runway', desc: 'Forecast cashflow runway across 30, 60, and 90-day buckets. Track Days Sales Outstanding (DSO) and optimize your working capital liquidity.' },
          ].map((feat, idx) => (
            <div
              key={idx}
              className={`feat-card reveal ${featuresSection.visible ? 'visible' : ''}`}
              style={stagger(idx)}
            >
              <div>
                <div className="feat-icon">{feat.icon}</div>
                <h3 className="feat-title">{feat.title}</h3>
                <p className="feat-desc">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON MATRIX ── */}
      <section className="comp-section" id="comparison" ref={compSection.ref}>
        <div className={`reveal ${compSection.visible ? 'visible' : ''}`}>
          <div className="section-header">
            <span className="section-tag">Why We Are 10x Better</span>
            <h2 className="section-title">Settlr vs. Traditional Invoicing Apps</h2>
          </div>

          <table className="comp-table">
            <thead>
              <tr>
                <th>Feature Capability</th>
                <th className="col-settlr">⚡ Settlr OS</th>
                <th>Zoho Invoice</th>
                <th>Khatabook / Vyapar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>45-Day MSMED Act Statutory Interest (20.25% p.a.)</td>
                <td className="col-settlr">✅ Automated & Legal Notice Ready</td>
                <td>❌ No Statutory Engine</td>
                <td>❌ Manual only</td>
              </tr>
              <tr>
                <td>Zero-MDR Direct NPCI Dynamic UPI QR</td>
                <td className="col-settlr">✅ 1-Click Embedded (0% Fees)</td>
                <td>⚠️ Gateway charges apply (2%)</td>
                <td>⚠️ Static QR only</td>
              </tr>
              <tr>
                <td>TDS Asset Ledger & Form 26AS Reconciliation</td>
                <td className="col-settlr">✅ Built-in Section 194J/194C</td>
                <td>⚠️ Partial / Add-on</td>
                <td>❌ No TDS Ledger</td>
              </tr>
              <tr>
                <td>Section 44ADA Presumptive Advance Tax Planner</td>
                <td className="col-settlr">✅ 4 Quarterly Deadlines Tracked</td>
                <td>❌ Not supported</td>
                <td>❌ Not supported</td>
              </tr>
              <tr>
                <td>AI Contract Legal Redlining & Risk Scoring</td>
                <td className="col-settlr">✅ Gemini 2.5 Flash Included</td>
                <td>❌ No AI legal analysis</td>
                <td>❌ No AI capabilities</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="testi-section" id="testimonials" ref={testimonialsSection.ref}>
        <div className={`reveal ${testimonialsSection.visible ? 'visible' : ''}`}>
          <div className="section-header">
            <span className="section-tag">What Our Users Say</span>
            <h2 className="section-title">Trusted by Freelancers & MSMEs Across India</h2>
          </div>
        </div>

        <div className="testi-grid">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className={`testi-card reveal ${testimonialsSection.visible ? 'visible' : ''}`}
              style={stagger(idx)}
            >
              <div className="testi-stars">★★★★★</div>
              <div className="testi-quote">&ldquo;{t.quote}&rdquo;</div>
              <div className="testi-footer">
                <div className="testi-author">
                  <div className="testi-avatar">{t.initials}</div>
                  <div>
                    <div className="testi-name-text">{t.name}</div>
                    <div className="testi-role-text">{t.role} · {t.city}</div>
                  </div>
                </div>
                <div className="testi-metric">{t.metric}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="faq-section" id="faq" ref={faqSection.ref}>
        <div className={`reveal ${faqSection.visible ? 'visible' : ''}`}>
          <div className="section-header">
            <span className="section-tag">Frequently Asked Questions</span>
            <h2 className="section-title">Everything You Need To Know</h2>
          </div>
        </div>

        <div>
          {faqs.map((faq, idx) => (
            <div
              className={`faq-item ${openFaq === idx ? 'open' : ''} reveal ${faqSection.visible ? 'visible' : ''}`}
              key={idx}
              style={stagger(idx)}
            >
              <div className="faq-q" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
                <span>{faq.q}</span>
                <span style={{
                  fontSize: 18, color: '#34D399',
                  transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: openFaq === idx ? 'rotate(45deg)' : 'none',
                  display: 'inline-block',
                }}>+</span>
              </div>
              {openFaq === idx && <div className="faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA BANNER ── */}
      <section className="cta-banner" ref={ctaSection.ref}>
        <div className={`reveal-scale ${ctaSection.visible ? 'visible' : ''}`}>
          <div className="cta-card">
            <h2 style={{ fontFamily: 'Outfit', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: '#FFF', marginBottom: 16, lineHeight: 1.15 }}>
              Ready to Collect Faster & Enforce Your Legal Rights?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', maxWidth: 640, margin: '0 auto 32px', lineHeight: 1.6 }}>
              Join thousands of Indian freelancers, agencies, and MSME vendors using Settlr to eliminate late payments and automate GST compliance.
            </p>
            <Link href="/login" className="btn-glow btn-large">
              Launch Your Free Settlr Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-logo" style={{ width: 28, height: 28 }}>
              <img src="/settlr-logo.png" alt="Settlr" />
            </div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 16, color: '#FFF' }}>Settlr</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>
              © {new Date().getFullYear()} Settlr. MSME Financial Operating System.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="#how-it-works" style={{ color: 'inherit', textDecoration: 'none' }}>How It Works</a>
            <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Features</a>
            <a href="#calculator" style={{ color: 'inherit', textDecoration: 'none' }}>Calculator</a>
            <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy (DPDP)</Link>
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
            <Link href="/refund-policy" style={{ color: 'inherit', textDecoration: 'none' }}>Refund Policy</Link>
            <Link href="/shipping-policy" style={{ color: 'inherit', textDecoration: 'none' }}>Delivery Policy</Link>
            <Link href="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact Us</Link>
            <Link href="/login" style={{ color: '#34D399', textDecoration: 'none', fontWeight: 600 }}>Sign In →</Link>
          </div>
        </div>
      </footer>
    </>
  )
}