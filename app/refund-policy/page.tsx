import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy — Settlr',
  description: 'Cancellation and refund policy for Settlr subscription plans, billing cycles, and payment settlements compliant with Razorpay & RBI guidelines.',
}

export default function RefundPolicyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#060A08',
      color: '#E5E7EB',
      fontFamily: "'DM Sans', sans-serif",
      padding: '40px 20px',
      lineHeight: 1.7,
    }}>
      <style>{`
        .refund-container {
          max-width: 860px;
          margin: 0 auto;
          background: rgba(14, 24, 18, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 20px;
          padding: 48px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }
        @media (max-width: 640px) {
          .refund-container { padding: 24px; }
        }
        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #34D399;
          margin-top: 32px;
          margin-bottom: 10px;
        }
        .card-highlight {
          background: rgba(16, 185, 129, 0.06);
          border-left: 4px solid #10B981;
          padding: 16px 20px;
          border-radius: 0 12px 12px 0;
          margin: 20px 0;
        }
        a { color: #34D399; text-decoration: underline; text-underline-offset: 3px; }
      `}</style>

      <div className="refund-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/settlr-logo.png" alt="Settlr" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 20, color: '#FFF' }}>Settlr</span>
          </Link>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#9CA3AF' }}>← Home</Link>
            <Link href="/contact" style={{ textDecoration: 'none', color: '#34D399' }}>Contact Us →</Link>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Outfit', fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
          Cancellation & Refund Policy
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>
          Last Updated: September 2026 · Compliant with Reserve Bank of India (RBI) payment guidelines and Razorpay Merchant Terms.
        </p>

        <div className="card-highlight">
          <strong style={{ color: '#FFF' }}>Key Summary:</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#D1D5DB' }}>
            You can cancel your Settlr subscription at any time from your billing dashboard. For first-time paid plan subscribers, we provide an unconditional <strong>7-Day Money-Back Guarantee</strong>. Approved refunds are credited back to the original payment source within <strong>5 to 7 business days</strong>.
          </p>
        </div>

        <h2 className="section-title">1. Subscription Cancellation</h2>
        <p>
          You may cancel your Settlr paid subscription (Pro or Agency plan) at any time directly through your dashboard at <Link href="/dashboard/billing">Dashboard → Billing</Link> or by sending an email request to <a href="mailto:support@usesettlr.in">support@usesettlr.in</a>.
        </p>
        <p>
          Upon cancellation, your subscription will remain active until the end of the current paid billing cycle (monthly or yearly), after which your account will automatically transition to our Starter (Free) plan without further charges.
        </p>

        <h2 className="section-title">2. 7-Day Money-Back Guarantee</h2>
        <p>
          If you are unsatisfied with Settlr Pro or Agency tier for any reason, you are entitled to a full refund if requested within <strong>7 days</strong> of your initial subscription purchase. To claim your refund, email <a href="mailto:support@usesettlr.in">support@usesettlr.in</a> with your registered email and Razorpay payment ID.
        </p>

        <h2 className="section-title">3. Refund Processing & Timelines</h2>
        <p>
          All approved refunds are processed through our payment gateway partner, <strong>Razorpay</strong>, directly to your original payment method:
        </p>
        <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
          <li><strong>UPI Payments:</strong> Credited to your linked bank account within 24–48 hours.</li>
          <li><strong>Credit / Debit Cards:</strong> Credited within 5 to 7 business days, depending on your card issuer bank.</li>
          <li><strong>Netbanking:</strong> Credited within 3 to 5 business days.</li>
        </ul>

        <h2 className="section-title">4. Duplicate Charges & Failed Transactions</h2>
        <p>
          In the event of duplicate billing caused by network interruptions or gateway timeouts, the excess amount is automatically detected and reversed. If you notice an un-reversed duplicate charge, contact our billing desk at <a href="mailto:support@usesettlr.in">support@usesettlr.in</a> with transaction references for instant resolution.
        </p>

        <h2 className="section-title">5. Client Invoice Payments (Third-Party Transactions)</h2>
        <p>
          Settlr provides invoicing software and generates dynamic UPI QR codes and bank wire instructions for invoices sent to your clients. <strong>Settlr is not an intermediary or escrow agent</strong> for the money settled directly between your clients and your bank account via UPI or wire transfer. Refunds between suppliers and their clients are governed by the underlying commercial contract between the respective parties.
        </p>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          Questions regarding refunds? Reach out to <a href="mailto:support@usesettlr.in">support@usesettlr.in</a> or visit our <Link href="/contact">Contact Page</Link>.
        </div>
      </div>
    </div>
  )
}
