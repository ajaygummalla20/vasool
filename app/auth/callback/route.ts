import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next')
  // Protect against open redirect attacks: ensure next is a relative URL and does not start with '//' or contain '\'
  const next = (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\'))
    ? rawNext
    : '/dashboard'
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[auth/callback] Missing Supabase environment configuration')
    return NextResponse.redirect(`${origin}/login?error=config_error`)
  }

  let response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }

    // Auto-create / verify profile
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name: user.user_metadata?.full_name ??
                       user.user_metadata?.name ??
                       user.email?.split('@')[0] ??
                       'User',
          },
          { onConflict: 'id', ignoreDuplicates: true }
        )

        const { data: profile } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('id', user.id)
          .single()

        if (!profile?.business_name) {
          const onboardingRedirect = NextResponse.redirect(`${origin}/onboarding`)
          response.cookies.getAll().forEach(c => onboardingRedirect.cookies.set(c.name, c.value))
          return onboardingRedirect
        }
      }
    } catch (profileErr) {
      console.error('[auth/callback] profile setup error:', profileErr)
    }

    return response
  } catch (err: unknown) {
    console.error('[auth/callback] unhandled error:', err)
    return NextResponse.redirect(`${origin}/login?error=callback_exception`)
  }
}