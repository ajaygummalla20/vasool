'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log unexpected runtime errors for observability
    console.error('[Settlr Runtime Boundary Error]:', error)
  }, [error])

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
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: 'rgba(14, 24, 18, 0.85)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 24,
        padding: '44px 36px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.1)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 26,
        }}>
          ⚠️
        </div>

        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: '#FFFFFF',
          marginBottom: 10,
          letterSpacing: '-0.02em',
        }}>
          Something went wrong
        </h1>

        <p style={{
          fontSize: 14,
          color: 'rgba(255, 255, 255, 0.65)',
          lineHeight: 1.6,
          marginBottom: 28,
        }}>
          An unexpected error occurred while loading this page. Our telemetry has captured this event for investigation.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '13px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ↻ Try Again
          </button>

          <Link
            href="/"
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
            }}
          >
            ← Return to Homepage
          </Link>
        </div>

        <div style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.4)',
        }}>
          If this persists, contact{' '}
          <a href="mailto:support@usesettlr.in" style={{ color: '#34D399', textDecoration: 'none' }}>
            support@usesettlr.in
          </a>
        </div>
      </div>
    </div>
  )
}
