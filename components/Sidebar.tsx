'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface SidebarProps {
  userName: string
  userEmail: string
}

const NAV = [
  { label: 'Dashboard',  path: '/dashboard',          icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { label: 'Invoices',   path: '/dashboard/invoices',  icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Clients',    path: '/dashboard/clients',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Contracts',  path: '/dashboard/contracts', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
]

const NAV2 = [
  { label: 'Scheduled',  path: '/dashboard/reminders/scheduled', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Sent log',   path: '/dashboard/reminders/log',       icon: 'M9 5l7 7-7 7' },
]

const NAV3 = [
  { label: 'Settings',   path: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

export default function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname   = usePathname()
  const router     = useRouter()

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

  const isActive = (path: string) => pathname === path

  return (
    <>
      <style>{`
        .sb {
          width: 200px; min-width: 200px;
          height: 100vh;
          background: #0C1A10;
          display: flex; flex-direction: column;
          position: fixed; left: 0; top: 0;
          z-index: 50;
          font-family: 'DM Sans', sans-serif;
        }

        .sb-logo {
          display: flex; align-items: center; gap: 9px;
          padding: 20px 16px 18px;
          border-bottom: .5px solid rgba(238,233,226,.07);
          flex-shrink: 0;
        }

        .sb-mark {
          width: 32px; height: 32px; border-radius: 8px;
          background: #2D8A58; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 1px rgba(45,138,88,.4);
        }

        .sb-name { font-size: 16px; font-weight: 700; color: #EEE9E2; letter-spacing: -.02em; line-height: 1; font-family: 'Lora', serif; }
        .sb-sub  { font-size: 8px; color: rgba(238,233,226,.26); margin-top: 1px; }

        .sb-nav { flex: 1; padding: 12px 0; overflow-y: auto; }

        .sb-section {
          font-size: 8px; font-weight: 600;
          color: rgba(238,233,226,.22);
          text-transform: uppercase; letter-spacing: .10em;
          padding: 0 16px; margin-bottom: 4px; margin-top: 10px;
        }

        .sb-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; cursor: pointer;
          transition: all .15s;
          text-decoration: none;
          position: relative;
        }

        .sb-item:hover { background: rgba(238,233,226,.05); }

        .sb-item.active {
          background: rgba(45,138,88,.15);
        }

        .sb-item.active::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 2px; background: #2D8A58;
          border-radius: 0 2px 2px 0;
        }

        .sb-item-label {
          font-size: 12px; font-weight: 400;
          color: rgba(238,233,226,.46);
          transition: color .15s;
          font-family: 'DM Sans', sans-serif;
        }

        .sb-item.active .sb-item-label,
        .sb-item:hover .sb-item-label { color: #EEE9E2; }

        .sb-item svg { flex-shrink: 0; opacity: .45; transition: opacity .15s; }
        .sb-item.active svg,
        .sb-item:hover svg { opacity: 1; }

        .sb-bottom {
          padding: 12px 10px;
          border-top: .5px solid rgba(238,233,226,.07);
          flex-shrink: 0;
        }

        .sb-user {
          background: rgba(238,233,226,.05);
          border: .5px solid rgba(238,233,226,.08);
          border-radius: 8px;
          padding: 9px 10px;
          display: flex; align-items: center; gap: 8px;
          cursor: default;
        }

        .sb-av {
          width: 26px; height: 26px; border-radius: 50%;
          background: linear-gradient(135deg, #E8692A, #C9951A);
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: white; flex-shrink: 0;
          font-family: 'DM Sans', sans-serif;
        }

        .sb-uname  { font-size: 11px; font-weight: 500; color: rgba(238,233,226,.80); line-height: 1; font-family: 'DM Sans', sans-serif; }
        .sb-uemail { font-size: 9px; color: rgba(238,233,226,.30); margin-top: 2px; font-family: 'DM Sans', sans-serif; }

        .sb-signout {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 10px; margin-top: 4px;
          cursor: pointer; border-radius: 6px;
          transition: background .15s;
          font-size: 11px; color: rgba(238,233,226,.35);
          font-family: 'DM Sans', sans-serif;
          border: none; background: transparent; width: 100%;
          text-align: left;
        }

        .sb-signout:hover { background: rgba(238,233,226,.05); color: rgba(238,233,226,.65); }
      `}</style>

      <aside className="sb">
        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-mark">
            <svg width="15" height="15" viewBox="0 0 22 22" fill="none">
              <path d="M4 11h14M4 7h9M4 15h11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="sb-name">Vasool</div>
            <div className="sb-sub">వసూల్</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sb-nav">
          <p className="sb-section">Main</p>
          {NAV.map(item => (
            <a
              key={item.path}
              href={item.path}
              className={`sb-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EEE9E2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              <span className="sb-item-label">{item.label}</span>
            </a>
          ))}

          <p className="sb-section">Reminders</p>
          {NAV2.map(item => (
            <a
              key={item.path}
              href={item.path}
              className={`sb-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EEE9E2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              <span className="sb-item-label">{item.label}</span>
            </a>
          ))}

          <p className="sb-section">Account</p>
          {NAV3.map(item => (
            <a
              key={item.path}
              href={item.path}
              className={`sb-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EEE9E2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              <span className="sb-item-label">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* User + Sign out */}
        <div className="sb-bottom">
          <div className="sb-user">
            <div className="sb-av">{initials || 'U'}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sb-uname" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userName || 'User'}
              </div>
              <div className="sb-uemail" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {userEmail}
              </div>
            </div>
          </div>
          <button className="sb-signout" onClick={handleSignOut}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}