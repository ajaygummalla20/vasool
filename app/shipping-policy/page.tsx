import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy — Settlr',
  description: 'Shipping and fulfillment policy for Settlr digital software services, invoice generation, and subscription activations.',
}

export default function ShippingPolicyPage() {
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
        .shipping-container {
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
          .shipping-container { padding: 24px; }
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

      <div className="shipping-container">
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
          Shipping & Delivery Policy (Digital Fulfillment)
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>
          Last Updated: September 2026 · Compliant with Razorpay Merchant Guidelines for Software-as-a-Service (SaaS).
        </p>

        <div className="card-highlight">
          <strong style={{ color: '#FFF' }}>Digital Delivery Summary:</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#D1D5DB' }}>
            Settlr delivers <strong>100% cloud-based software services (SaaS)</strong>. No physical goods or packages are shipped. Service provisioning, subscription upgrades, and access to all tools are delivered <strong>instantaneously</strong> in real time upon successful payment authorization.
          </p>
        </div>

        <h2 className="section-title">1. Delivery Mode & Turnaround Time</h2>
        <p>
          All features of the Settlr Financial Operating System (including unlimited GST invoices, AI contract analysis, receipt OCR parsing, GSTR-1 JSON export, and WhatsApp reminders) are provisioned digitally:
        </p>
        <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
          <li><strong>Subscription Activation:</strong> Immediate upon successful Razorpay payment verification (typically within 1–5 seconds).</li>
          <li><strong>Invoice & Document Delivery:</strong> Invoices, payment links, and receipts are generated instantly and accessible via the online web dashboard or sent to clients via digital email/WhatsApp deep-links.</li>
          <li><strong>Data Exports:</strong> JSON archives and financial statements download directly to your local device upon request.</li>
        </ul>

        <h2 className="section-title">2. Shipping Charges</h2>
        <p>
          Because all services and digital goods are delivered electronically over the internet, there are <strong>zero (₹0) shipping or delivery charges</strong> associated with any Settlr service or subscription tier.
        </p>

        <h2 className="section-title">3. Delivery Confirmation & Invoicing</h2>
        <p>
          Upon successful subscription payment via Razorpay, a digital tax invoice and payment confirmation receipt are automatically dispatched to your registered account email address. Your updated account privileges will reflect immediately inside the application.
        </p>

        <h2 className="section-title">4. Non-Delivery or Access Issues</h2>
        <p>
          If your account status fails to reflect your purchased subscription tier within 15 minutes of payment confirmation, please contact our support team at <a href="mailto:support@usesettlr.in">support@usesettlr.in</a> with your Razorpay payment ID. Our technical support team resolves provisioning sync issues within 2 to 4 business hours.
        </p>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          Need assistance with your subscription? Visit our <Link href="/contact">Contact Page</Link> or email <a href="mailto:support@usesettlr.in">support@usesettlr.in</a>.
        </div>
      </div>
    </div>
  )
}
