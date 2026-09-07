export default function DashboardLoading() {
  return (
    <>
      <style>{`
        .ld-root{display:flex;min-height:100vh;background:#080E0A;color:#F3F4F6}
        .ld-sidebar{width:220px;border-right:1px solid rgba(255,255,255,0.06);padding:24px 16px;display:flex;flex-direction:column;gap:14px}
        .ld-main{flex:1;display:flex;flex-direction:column}
        .ld-top{height:68px;border-bottom:1px solid rgba(255,255,255,0.06);padding:0 32px;display:flex;align-items:center;justify-content:space-between;background:rgba(12,22,15,0.7)}
        .ld-content{padding:28px 32px;display:flex;flex-direction:column;gap:20px;max-width:1440px;width:100%;margin:0 auto}
        .ld-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:16px}
        
        @media(max-width:900px){
          .ld-sidebar{display:none}
          .ld-top{padding:14px 16px;height:auto}
          .ld-content{padding:16px;padding-top:64px}
          .ld-grid{grid-template-columns:1fr 1fr}
        }
        @media(max-width:600px){
          .ld-grid{grid-template-columns:1fr}
        }
      `}</style>
      <div className="kokonut-top-beam" />
      <div className="ld-root">
        {/* Sidebar Space placeholder */}
        <div className="ld-sidebar">
          <div className="kokonut-skeleton" style={{ height: 38, width: 140, borderRadius: 10 }} />
          <div style={{ height: 20 }} />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="kokonut-skeleton" style={{ height: 32, width: '100%', borderRadius: 8 }} />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="ld-main">
          {/* Topbar Skeleton */}
          <div className="ld-top">
            <div>
              <div className="kokonut-skeleton" style={{ height: 20, width: 180, marginBottom: 6 }} />
              <div className="kokonut-skeleton" style={{ height: 12, width: 240 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="kokonut-skeleton" style={{ height: 36, width: 100, borderRadius: 10 }} />
              <div className="kokonut-skeleton" style={{ height: 36, width: 120, borderRadius: 10 }} />
            </div>
          </div>

          {/* Body Content Skeleton */}
          <div className="ld-content">
            {/* 4 Stat Cards */}
            <div className="ld-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="kokonut-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="kokonut-skeleton" style={{ height: 12, width: 90 }} />
                    <div className="kokonut-skeleton" style={{ height: 24, width: 24, borderRadius: '50%' }} />
                  </div>
                  <div className="kokonut-skeleton" style={{ height: 28, width: 130 }} />
                  <div className="kokonut-skeleton" style={{ height: 10, width: 110 }} />
                </div>
              ))}
            </div>

            {/* Banner Skeleton */}
            <div className="kokonut-card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="kokonut-skeleton" style={{ height: 18, width: 260 }} />
                <div className="kokonut-skeleton" style={{ height: 12, width: '100%', maxWidth: 400 }} />
              </div>
              <div className="kokonut-skeleton" style={{ height: 38, width: 140, borderRadius: 10 }} />
            </div>

            {/* Table / Content Card Skeleton */}
            <div className="kokonut-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 14 }}>
                <div className="kokonut-skeleton" style={{ height: 16, width: 160 }} />
                <div className="kokonut-skeleton" style={{ height: 14, width: 80 }} />
              </div>
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 0' }}>
                  <div className="kokonut-skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="kokonut-skeleton" style={{ height: 14, width: '40%' }} />
                    <div className="kokonut-skeleton" style={{ height: 10, width: '25%' }} />
                  </div>
                  <div className="kokonut-skeleton" style={{ height: 20, width: 80, borderRadius: 100 }} />
                  <div className="kokonut-skeleton" style={{ height: 16, width: 90 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
