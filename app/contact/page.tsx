import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us & Grievance Redressal — Settlr',
  description: 'Get in touch with Settlr support team, operating address in India, and Grievance Redressal Officer under the DPDP Act 2023.',
}

export default function ContactPage() {
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
        .contact-container {
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
          .contact-container { padding: 24px; }
        }
        .grid-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          margin: 28px 0;
        }
        .info-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 20px;
        }
        .info-card-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .info-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #FFF;
          margin-bottom: 6px;
        }
        .info-card-text {
          font-size: 13px;
          color: #9CA3AF;
          line-height: 1.6;
        }
        a { color: #34D399; text-decoration: underline; text-underline-offset: 3px; }
        a:hover { color: #6EE7B7; }
      `}</style>

      <div className="contact-container">
        {/* Navigation */}
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

        <h1 style={{ fontFamily: 'Outfit', fontSize: 'clamp(28px, 3.5vw, 38px)', fontWeight: 800, color: '#FFF', marginBottom: 8 }}>
          Contact Us & Support
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: 14, maxWidth: 640 }}>
          We are here to support Indian MSMEs, contractors, and agencies. Reach out for billing queries, technical support, or statutory compliance assistance.
        </p>

        <div className="grid-cards">
          {/* Email Support */}
          <div className="info-card">
            <div className="info-card-icon">📧</div>
            <div className="info-card-title">Customer & Billing Support</div>
            <div className="info-card-text">
              For account, billing, or technical queries:<br />
              <a href="mailto:support@usesettlr.in">support@usesettlr.in</a><br />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Response within 24 hours</span>
            </div>
          </div>

          {/* Grievance Officer */}
          <div className="info-card">
            <div className="info-card-icon">⚖️</div>
            <div className="info-card-title">Grievance & Privacy Officer</div>
            <div className="info-card-text">
              Under DPDP Act 2023 & Consumer Protection Rules:<br />
              <a href="mailto:grievance@usesettlr.in">grievance@usesettlr.in</a><br />
              <span style={{ fontSize: 11, color: '#6B7280' }}>7-Day Statutory SLA</span>
            </div>
          </div>

          {/* Operational Address */}
          <div className="info-card">
            <div className="info-card-icon">📍</div>
            <div className="info-card-title">Operating Location</div>
            <div className="info-card-text">
              <strong>Settlr Technologies</strong><br />
              Hyderabad, Telangana, 500081, India.<br />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Operating in the Republic of India</span>
            </div>
          </div>

          {/* Support Hours */}
          <div className="info-card">
            <div className="info-card-icon">🕒</div>
            <div className="info-card-title">Business Hours</div>
            <div className="info-card-text">
              Monday – Saturday<br />
              9:00 AM – 6:00 PM IST<br />
              <span style={{ fontSize: 11, color: '#6B7280' }}>Excluding Indian National Holidays</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, padding: 20, marginTop: 24 }}>
          <h3 style={{ fontFamily: 'Outfit', color: '#34D399', fontSize: 16, margin: '0 0 6px' }}>Legal & Compliance Policy Links</h3>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            Review our statutory documentation:{' '}
            <Link href="/privacy">Privacy Notice (DPDP Act 2023)</Link> ·{' '}
            <Link href="/terms">Terms of Service</Link> ·{' '}
            <Link href="/refund-policy">Cancellation & Refund Policy</Link> ·{' '}
            <Link href="/shipping-policy">Digital Fulfillment Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
