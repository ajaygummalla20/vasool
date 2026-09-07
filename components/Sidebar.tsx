'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface SidebarProps {
  userName: string
  userEmail: string
}

interface NavItem {
  label: string
  path: string
  icon: string
  badge?: string
}

const NAV: NavItem[] = [
  { label: 'Dashboard',       path: '/dashboard',                  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Invoices',        path: '/dashboard/invoices',          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Recurring',       path: '/dashboard/invoices/recurring',icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { label: 'Proposals',       path: '/dashboard/proposals',         icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { label: 'Clients',         path: '/dashboard/clients',           icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Contracts AI',    path: '/dashboard/contracts',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { label: 'Expenses',        path: '/dashboard/expenses',          icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'TDS & 26AS',      path: '/dashboard/tds',               icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', badge: 'ITR' },
  { label: 'Cashflow Runway', path: '/dashboard/cashflow',          icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', badge: '90D' },
  { label: 'GST & Tax Hub',   path: '/dashboard/gst',               icon: 'M9 14l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Reports',         path: '/dashboard/reports',           icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
]

const NAV2 = [
  { label: 'Scheduled',     path: '/dashboard/reminders/scheduled', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Sent Log',      path: '/dashboard/reminders/log',       icon: 'M9 5l7 7-7 7' },
]

const NAV3: NavItem[] = [
  { label: 'Billing & Plans', path: '/dashboard/billing',  icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', badge: '⚡ Pro' },
  { label: 'Settings',        path: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

import { useState, useEffect } from 'react'

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)

  useEffect(() => {
    setIsNavigating(false)
    setMobileOpen(false)
  }, [pathname])

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleNavigate = (path: string) => {
    setMobileOpen(false)
    if (path !== pathname) {
      setIsNavigating(true)
      router.push(path)
    }
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  return (
    <>
      <style>{`
        .sb-kokonut {
          width: 220px; min-width: 220px;
          height: 100vh;
          background: rgba(10, 18, 12, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex; flex-direction: column;
          position: fixed; left: 0; top: 0;
          z-index: 90;
          font-family: 'Outfit', sans-serif;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sb-header {
          display: flex; align-items: center; gap: 10px;
          padding: 22px 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
          cursor: pointer;
        }

        .sb-logo-aura {
          width: 36px; height: 36px; border-radius: 11px;
          background: linear-gradient(135deg, #10B981, #059669);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .sb-brand-name {
          font-family: 'Outfit', sans-serif;
          font-size: 18px; font-weight: 800;
          color: #FFFFFF; letter-spacing: -.02em; line-height: 1;
        }
        .sb-brand-sub { font-size: 9px; color: rgba(255, 255, 255, 0.4); margin-top: 3px; font-weight: 500; }

        .sb-nav-body { flex: 1; padding: 16px 0; overflow-y: auto; }

        .sb-group-title {
          font-size: 9px; font-weight: 700;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase; letter-spacing: .12em;
          padding: 0 18px; margin-bottom: 6px; margin-top: 14px;
        }

        .sb-link {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 18px; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
          position: relative;
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px; font-weight: 500;
        }

        .sb-link:hover {
          color: #FFFFFF;
          background: rgba(255, 255, 255, 0.04);
        }

        .sb-link.active {
          color: #FFFFFF;
          background: rgba(16, 185, 129, 0.14);
          font-weight: 600;
        }

        .sb-link.active::before {
          content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3.5px;
          border-top-right-radius: 4px; border-bottom-right-radius: 4px;
          background: #10B981; box-shadow: 0 0 12px #10B981;
        }

        .sb-link-icon {
          width: 17px; height: 17px; flex-shrink: 0;
          stroke: currentColor; stroke-width: 1.8;
          fill: none; stroke-linecap: round; stroke-linejoin: round;
        }

        .sb-badge-pill {
          font-size: 9px; font-weight: 700; background: rgba(16, 185, 129, 0.25); color: #34D399;
          padding: 2px 7px; border-radius: 100px; margin-left: auto; border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .sb-user-card {
          padding: 14px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex; align-items: center; gap: 10px;
          flex-shrink: 0; background: rgba(0, 0, 0, 0.3);
        }

        .sb-avatar-box {
          width: 32px; height: 32px; border-radius: 9px;
          background: rgba(16, 185, 129, 0.2); color: #34D399;
          font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; border: 1px solid rgba(16, 185, 129, 0.4);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        }

        .sb-user-name { font-size: 12px; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
        .sb-user-email { font-size: 10px; color: rgba(255, 255, 255, 0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }

        .sb-logout-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255, 255, 255, 0.3); padding: 6px; border-radius: 6px;
          margin-left: auto; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .sb-logout-btn:hover { color: #F87171; background: rgba(248, 113, 113, 0.1); }

        /* Mobile topbar */
        .sb-mobile-topbar {
          display: none;
          position: fixed; top: 0; left: 0; right: 0; height: 56px;
          background: rgba(10, 18, 12, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 16px;
          align-items: center; justify-content: space-between;
          z-index: 80;
        }
        .sb-mobile-brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .sb-hamburger-btn {
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
          color: #FFF; border-radius: 9px; width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
        }

        /* Mobile bottom dock */
        .sb-bottom-dock {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; height: 60px;
          background: rgba(10, 18, 12, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 80;
          display: none;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          padding: 0 4px;
        }
        .sb-dock-item {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 3px; color: rgba(255, 255, 255, 0.5); font-size: 10px; font-weight: 600;
          text-decoration: none; cursor: pointer; padding: 6px 0;
          transition: color 0.15s;
        }
        .sb-dock-item.active { color: #34D399; }
        .sb-dock-item-create {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2px; font-size: 10px; font-weight: 700; color: #34D399; cursor: pointer;
        }
        .sb-dock-create-btn {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, #10B981, #059669);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
        }

        /* Backdrop overlay */
        .sb-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          z-index: 85;
        }

        @media(max-width: 900px) {
          .sb-mobile-topbar { display: flex; }
          .sb-bottom-dock { display: grid; }
          .sb-kokonut {
            transform: translateX(-100%);
            width: 260px; min-width: 260px;
            box-shadow: 20px 0 50px rgba(0, 0, 0, 0.8);
          }
          .sb-kokonut.mobile-open {
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Mobile Topbar */}
      <div className="sb-mobile-topbar">
        <div className="sb-mobile-brand" onClick={() => handleNavigate('/dashboard')}>
          <div className="sb-logo-aura" style={{ padding: 0, overflow: 'hidden', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/settlr-logo.png" alt="Settlr" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <span className="sb-brand-name" style={{ fontSize: 16 }}>Settlr</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', display: 'block', marginTop: -1 }}>MSME OS</span>
          </div>
        </div>
        <button className="sb-hamburger-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          )}
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div className="sb-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Bottom Quick Dock */}
      <div className="sb-bottom-dock">
        <a className={`sb-dock-item ${pathname === '/dashboard' ? 'active' : ''}`} onClick={() => handleNavigate('/dashboard')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <span>Home</span>
        </a>
        <a className={`sb-dock-item ${pathname.startsWith('/dashboard/invoices') && !pathname.includes('/new') ? 'active' : ''}`} onClick={() => handleNavigate('/dashboard/invoices')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>Invoices</span>
        </a>
        <a className="sb-dock-item-create" onClick={() => handleNavigate('/dashboard/invoices/new')}>
          <div className="sb-dock-create-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4"/></svg>
          </div>
          <span>+ Bill</span>
        </a>
        <a className={`sb-dock-item ${pathname.startsWith('/dashboard/cashflow') ? 'active' : ''}`} onClick={() => handleNavigate('/dashboard/cashflow')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          <span>Cashflow</span>
        </a>
        <a className={`sb-dock-item ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(!mobileOpen)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          <span>Menu</span>
        </a>
      </div>

      {isNavigating && <div className="kokonut-top-beam" />}
      <aside className={`sb-kokonut ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sb-header" onClick={() => handleNavigate('/dashboard')}>
          <div className="sb-logo-aura" style={{ padding: 0, overflow: 'hidden', width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/settlr-logo.png" alt="Settlr" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
          </div>
          <div>
            <div className="sb-brand-name">Settlr</div>
            <div className="sb-brand-sub">MSME Financial OS</div>
          </div>
        </div>

        <div className="sb-nav-body">
          <div className="sb-group-title">Core Operating System</div>
          {NAV.map(item => (
            <a
              key={item.path}
              className={`sb-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); handleNavigate(item.path) }}
              href={item.path}
            >
              <svg className="sb-link-icon" viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
              {item.badge && <span className="sb-badge-pill">{item.badge}</span>}
            </a>
          ))}

          <div className="sb-group-title">WhatsApp Payment Recovery</div>
          {NAV2.map(item => (
            <a
              key={item.path}
              className={`sb-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); handleNavigate(item.path) }}
              href={item.path}
            >
              <svg className="sb-link-icon" viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </a>
          ))}

          <div className="sb-group-title">System Settings</div>
          {NAV3.map(item => (
            <a
              key={item.path}
              className={`sb-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); handleNavigate(item.path) }}
              href={item.path}
            >
              <svg className="sb-link-icon" viewBox="0 0 24 24">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
              {item.badge && <span className="sb-badge-pill">{item.badge}</span>}
            </a>
          ))}
        </div>

        <div className="sb-user-card">
          <div className="sb-avatar-box">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-user-name">{userName}</div>
            <div className="sb-user-email">{userEmail}</div>
          </div>
          <button className="sb-logout-btn" onClick={handleSignOut} title="Sign Out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  )
}