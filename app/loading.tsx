export default function RootLoading() {
  return (
    <>
      <div className="kokonut-top-beam" />
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
          gap: 16,
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
        <div className="kokonut-skeleton" style={{ height: 16, width: 140, borderRadius: 6 }} />
      </div>
    </>
  )
}
