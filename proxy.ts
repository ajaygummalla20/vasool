import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Trust corporate proxy SSL certificate chain when running locally
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

/**
 * Next.js 16 Proxy Convention (formerly Middleware)
 * Runs server-side before route execution to refresh auth session tokens and guard private routes.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkeyonsreywpzigqmnuk.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZXlvbnNyZXl3cHppZ3FtbnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNjE4MjIsImV4cCI6MjA5MjYzNzgyMn0.OL1BzqSkq23ErNwAG1s4DNJFDOVUSfrEarYBfJlsUDM'

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Refresh session token before checking routes
    const { data: { user } } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Protect private dashboard and onboarding routes
    if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect authenticated users away from /login
    if (user && pathname === '/login') {
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashUrl)
    }

  } catch (err) {
    console.error('Proxy auth refresh error:', err)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
