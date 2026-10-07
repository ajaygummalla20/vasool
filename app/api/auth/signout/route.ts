import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Server-Side Sign-Out Endpoint
 * Guarantees that all Supabase authentication cookies are wiped from the response.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, { ...options, maxAge: 0 })
        )
      },
    },
  })

  await supabase.auth.signOut()
  return response
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(`${origin}/login`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, { ...options, maxAge: 0 })
        )
      },
    },
  })

  await supabase.auth.signOut()
  return response
}
