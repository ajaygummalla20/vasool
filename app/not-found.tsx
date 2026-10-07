import Link from 'next/link'

export const metadata = {
  title: 'Page Not Found | Settlr',
  description: 'The requested page could not be found on Settlr MSME Financial OS.',
}

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#060A08',
      color: '#F3F4F6',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'rgba(14, 24, 18, 0.75)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: 24,
        padding: '48px 36px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.08)',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(12px)',
      }}>
        {/* Brand Icon */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: 28,
        }}>
          🛡️
        </div>

        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 72,
          fontWeight: 900,
          background: 'linear-gradient(135deg, #34D399, #10B981)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: 12,
        }}>
          404
        </div>

        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: '#FFFFFF',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Page Not Found
        </h1>

        <p style={{
          fontSize: 14,
          color: 'rgba(255, 255, 255, 0.6)',
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          The page or invoice link you are looking for may have been moved, expired, or does not exist.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
          >
            ← Return to Settlr Homepage
          </Link>

          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.85)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            Go to User Dashboard
          </Link>
        </div>

        <div style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.4)',
        }}>
          Need assistance? Contact us at{' '}
          <Link href="/contact" style={{ color: '#34D399', textDecoration: 'none', fontWeight: 600 }}>
            support@usesettlr.in
          </Link>
        </div>
      </div>
    </div>
  )
}
