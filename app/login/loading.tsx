export default function LoginLoading() {
  return (
    <>
      <style>{`
        @keyframes loginPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#080E0A',
          color: '#F3F4F6',
          fontFamily: "'Outfit', sans-serif",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.5)',
            overflow: 'hidden',
          }}
        >
          <img src="/settlr-logo.png" alt="Settlr" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            width: 24,
            height: 24,
            border: '3px solid rgba(16, 185, 129, 0.2)',
            borderTopColor: '#10B981',
            borderRadius: '50%',
            animation: 'loginSpin 0.7s linear infinite',
          }}
        />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', animation: 'loginPulse 1.5s ease infinite' }}>
          Loading Settlr...
        </div>
      </div>
    </>
  )
}
