import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Settlr',
  description: 'Terms of Service for Settlr MSME financial operating system, GST billing, and MSMED Act late fee interest calculations.',
}

export default function TermsPage() {
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
        .terms-container {
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
          .terms-container { padding: 24px; }
        }
        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #34D399;
          margin-top: 36px;
          margin-bottom: 12px;
        }
        a { color: #34D399; text-decoration: underline; text-underline-offset: 3px; }
      `}</style>

      <div className="terms-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/settlr-logo.png" alt="Settlr" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 20, color: '#FFF' }}>Settlr</span>
          </Link>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#9CA3AF' }}>← Home</Link>
            <Link href="/privacy" style={{ textDecoration: 'none', color: '#34D399' }}>Privacy Notice →</Link>
          </div>
        </div>

        <h1 style={{ fontFamily: 'Outfit', fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
          Terms of Service
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Last Updated: September 2026 · Settlr Financial Operating System</p>

        <h2 className="section-title">1. Acceptance of Terms</h2>
        <p>
          By creating an account, accessing, or using Settlr (accessible at <a href="https://usesettlr.in">usesettlr.in</a>), you agree to be bound by these Terms of Service and our <Link href="/privacy">DPDP Privacy Policy</Link>.
        </p>

        <h2 className="section-title">2. Scope of Services</h2>
        <p>
          Settlr provides software tools for GST-compliant invoicing, late fee interest calculation under the <em>Micro, Small and Medium Enterprises Development (MSMED) Act, 2006</em>, NPCI dynamic UPI QR generation, AI contract risk analysis, and receipt OCR expense tracking.
        </p>

        <h2 className="section-title">3. Statutory Calculations & Legal Disclaimers</h2>
        <p>
          Interest calculations computed under Section 16 of the MSMED Act 2006 (three times the bank rate notified by the Reserve Bank of India, compounded with monthly rests) and Advance Tax projections under Section 44ADA are provided as software tools based on statutory rules. While calculated to high mathematical fidelity, they do not constitute formal legal or chartered accountancy counsel.
        </p>

        <h2 className="section-title">4. User Responsibilities & Data Accuracy</h2>
        <p>
          You are solely responsible for ensuring the accuracy of your GSTIN, client billing addresses, HSN/SAC codes, and invoice amounts. You agree not to upload fraudulent invoices, malicious files, or unauthorized third-party personal data.
        </p>

        <h2 className="section-title">5. Data Protection</h2>
        <p>
          We protect your personal and business data under the <em>Digital Personal Data Protection Act, 2023</em>. You can review your statutory rights, download data archives, or request data deletion under our <Link href="/privacy">Privacy Notice</Link>.
        </p>

        <h2 className="section-title">6. Contact & Dispute Resolution</h2>
        <p>
          For queries regarding these terms or platform operations, contact <a href="mailto:support@usesettlr.in">support@usesettlr.in</a>. Grievances regarding personal data are handled by our Grievance Redressal Officer at <a href="mailto:grievance@usesettlr.in">grievance@usesettlr.in</a>.
        </p>
      </div>
    </div>
  )
}
