import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DPDP Privacy Notice & Data Protection Policy',
  description: 'Statutory digital personal data protection notice and privacy policy under the Digital Personal Data Protection (DPDP) Act, 2023 for Settlr users.',
}

export default function PrivacyPage() {
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
        .privacy-container {
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
          .privacy-container { padding: 24px; }
        }
        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #34D399;
          margin-top: 36px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 14px;
        }
        .data-table th, .data-table td {
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 14px;
          text-align: left;
        }
        .data-table th {
          background: rgba(16, 185, 129, 0.1);
          color: #A7F3D0;
          font-weight: 600;
        }
        .badge {
          display: inline-block;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34D399;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .card-highlight {
          background: rgba(16, 185, 129, 0.06);
          border-left: 4px solid #10B981;
          padding: 16px 20px;
          border-radius: 0 12px 12px 0;
          margin: 20px 0;
        }
        a { color: #34D399; text-decoration: underline; text-underline-offset: 3px; }
        a:hover { color: #6EE7B7; }
      `}</style>

      <div className="privacy-container">
        {/* Navigation / Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/settlr-logo.png" alt="Settlr" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 20, color: '#FFF' }}>Settlr</span>
          </Link>
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <Link href="/" style={{ textDecoration: 'none', color: '#9CA3AF' }}>← Home</Link>
            <Link href="/dashboard" style={{ textDecoration: 'none', color: '#34D399', fontWeight: 600 }}>Dashboard →</Link>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <span className="badge">Statutory Notice under DPDP Act, 2023</span>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 800, color: '#FFF', marginTop: 12, marginBottom: 8, lineHeight: 1.2 }}>
            Digital Personal Data Protection Notice & Privacy Policy
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>
            Effective Date: September 2026 · Compliant with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and applicable rules notified by the Ministry of Electronics & Information Technology (MeitY), Government of India.
          </p>
        </div>

        <div className="card-highlight">
          <strong style={{ color: '#FFF' }}>Plain-English Summary (Section 5 Notice):</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#D1D5DB' }}>
            Settlr operates as a <strong>Data Fiduciary</strong> for the business and personal data you provide. We only collect the minimal digital personal data required to generate legal GST tax invoices, compute MSMED Act 45-day statutory late fees, generate dynamic NPCI UPI QR payment links, and audit expenses. You possess statutory rights to access, download a complete data export, correct, or permanently erase your personal data at any time from your account settings.
          </p>
        </div>

        {/* Section 1 */}
        <h2 className="section-title">1. Data Fiduciary Identity & Scope</h2>
        <p>
          This Privacy Notice applies to all digital personal data processed by <strong>Settlr</strong> (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), having its primary digital platform at <a href="https://usesettlr.in">usesettlr.in</a>. Settlr provides financial operating tools for Indian micro, small, and medium enterprises (MSMEs), independent contractors, and freelance professionals.
        </p>

        {/* Section 2 */}
        <h2 className="section-title">2. Categories of Personal Data Collected (Section 5 & 6)</h2>
        <p>
          We adhere to the principle of <em>Data Minimization</em> under Section 6 of the DPDP Act. We only collect data essential for the performance of our financial and legal compliance services:
        </p>

        <table className="data-table">
          <thead>
            <tr>
              <th>Data Category</th>
              <th>Specific Data Points</th>
              <th>Statutory / Operational Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Identity & Contact</strong></td>
              <td>Full Name, Email Address, Phone/WhatsApp number, Business Name.</td>
              <td>Account creation, user authentication, customer support, and sending payment reminder notifications.</td>
            </tr>
            <tr>
              <td><strong>Tax & Statutory Identifiers</strong></td>
              <td>GSTIN (Goods and Services Tax Identification Number), PAN, MSME Udyam Registration Number.</td>
              <td>Generating statutory GST-compliant invoices and computing Section 15-16 MSMED Act late interest claims.</td>
            </tr>
            <tr>
              <td><strong>Banking & Payment Details</strong></td>
              <td>UPI VPA (Virtual Payment Address), Bank Account Number, IFSC code, Bank Name.</td>
              <td>Embedding dynamic NPCI-compliant UPI QR codes on client invoices and enabling direct customer-to-vendor settlement.</td>
            </tr>
            <tr>
              <td><strong>Client / Counterparty Data</strong></td>
              <td>Client Name, Company Name, Client GSTIN, Billing Address, Client Email/Phone.</td>
              <td>Printing consignee and purchaser details on statutory tax invoices and delivery memos.</td>
            </tr>
            <tr>
              <td><strong>Documents & OCR Data</strong></td>
              <td>Uploaded contract documents, physical receipt photos, invoice line items.</td>
              <td>Performing automated AI OCR expense categorization and contractual risk assessment via Google Gemini.</td>
            </tr>
          </tbody>
        </table>

        {/* Section 3 */}
        <h2 className="section-title">3. Lawful Basis for Processing Data</h2>
        <p>
          Under Section 4 and Section 6 of the DPDP Act, Settlr processes your personal data on the following lawful bases:
        </p>
        <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
          <li><strong>Consent:</strong> Explicit, free, specific, informed, and unambiguous affirmative consent granted by you during onboarding or sign-in.</li>
          <li><strong>Performance of Contract:</strong> To generate invoices, track payment receivables, generate UPI links, and deliver requested features.</li>
          <li><strong>Legal Obligation:</strong> Compliance with the <em>Central Goods and Services Tax (CGST) Act, 2017</em>, the <em>Micro, Small and Medium Enterprises Development (MSMED) Act, 2006</em>, and the <em>Income Tax Act, 1961</em>.</li>
        </ul>

        {/* Section 4 */}
        <h2 className="section-title">4. Third-Party Data Processors & Sub-Processors</h2>
        <p>
          To deliver resilient cloud services, Settlr engages trusted Data Processors who are bound by stringent confidentiality and security obligations:
        </p>
        <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
          <li><strong>Supabase (PostgreSQL):</strong> Encrypted database storage, user authentication, and multi-tenant Row-Level Security (RLS) isolation.</li>
          <li><strong>Razorpay:</strong> Cryptographic payment gateway processing for Settlr platform subscription upgrades (we never store card numbers or banking passwords).</li>
          <li><strong>Google Gemini API:</strong> Multimodal AI processing for OCR extraction of expense receipts and legal contract risk analysis. Documents sent to the API are processed ephemerally and not used to train public foundation models.</li>
          <li><strong>Vercel:</strong> Edge network hosting and serverless infrastructure with strict TLS 1.3 encryption in transit.</li>
        </ul>

        {/* Section 5 */}
        <h2 className="section-title">5. Data Retention & Statutory Storage Limitations</h2>
        <p>
          We retain your personal data only as long as necessary to fulfill the purposes for which it was collected or to satisfy legal, regulatory, or tax obligations:
        </p>
        <div className="card-highlight">
          <strong>Tax Record-Keeping Obligation:</strong> Under Section 36 of the CGST Act 2017, registered taxpayers are mandated to maintain books of accounts, tax invoices, and credit notes for a statutory retention period of <strong>72 months (6 years)</strong> from the due date of furnishing the annual return for the relevant financial year.
        </div>

        {/* Section 6 */}
        <h2 className="section-title">6. Statutory Rights of the Data Principal (Sections 11–14)</h2>
        <p>As a Data Principal under the DPDP Act 2023, you have the following enforceable legal rights:</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '16px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ color: '#34D399', margin: '0 0 8px' }}>📥 Right to Access & Portability (Sec 11)</h4>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              You can download a complete, structured JSON archive of your personal profile, clients, invoices, and expenses anytime via <Link href="/dashboard/settings">Settings → Data Rights</Link>.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ color: '#34D399', margin: '0 0 8px' }}>✏️ Right to Correction (Sec 12)</h4>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              You have the right to correct, update, or complete any inaccurate or obsolete personal and business details directly in your Profile settings.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ color: '#EF4444', margin: '0 0 8px' }}>🗑️ Right to Erasure / Forgotten (Sec 12)</h4>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              You may trigger an immediate account deletion and personal data purge through the Data Rights tab, subject to statutory tax compliance hold periods.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
            <h4 style={{ color: '#34D399', margin: '0 0 8px' }}>🤝 Right to Nominate (Sec 14)</h4>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              You have the right to nominate an individual who shall, in the event of your death or incapacity, exercise your rights as a Data Principal.
            </p>
          </div>
        </div>

        {/* Section 7 */}
        <h2 className="section-title">7. Grievance Redressal Mechanism & Officer (Section 8(10) & 13)</h2>
        <p>
          In compliance with Section 8(10) and Section 13 of the DPDP Act, Settlr has designated a dedicated Grievance Redressal Officer to address your queries, requests, or complaints:
        </p>

        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 12, padding: 20, margin: '16px 0' }}>
          <h4 style={{ color: '#FFF', margin: '0 0 8px' }}>Data Protection & Grievance Redressal Officer</h4>
          <p style={{ fontSize: 14, margin: '4px 0' }}><strong>Name:</strong> Grievance Redressal Desk, Settlr Compliance</p>
          <p style={{ fontSize: 14, margin: '4px 0' }}><strong>Email:</strong> <a href="mailto:grievance@usesettlr.in">grievance@usesettlr.in</a> (copy: <a href="mailto:privacy@usesettlr.in">privacy@usesettlr.in</a>)</p>
          <p style={{ fontSize: 14, margin: '4px 0' }}><strong>Response Time (SLA):</strong> Initial acknowledgment within 24 hours; formal resolution within <strong>7 business days</strong>.</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '12px 0 0' }}>
            If you are unsatisfied with the resolution provided by our Grievance Officer, you may file an appeal before the <strong>Data Protection Board of India (DPBI)</strong> in accordance with Section 13(4) of the DPDP Act, 2023.
          </p>
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
          © {new Date().getFullYear()} Settlr (usesettlr.in). All rights reserved. Registered under Indian commercial and data protection laws.
        </div>
      </div>
    </div>
  )
}
