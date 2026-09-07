import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase-server'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

export async function GET(request: NextRequest) {
  const url    = new URL(request.url)
  const code   = url.searchParams.get('code')
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[callback] error:', error.message)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  // Auto-create profile on first login
  const { data, error: userError } = await supabase.auth.getUser()
  const user = data?.user

  if (user && !userError) {
    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name ??
                   user.user_metadata?.name ??
                   user.email?.split('@')[0] ??
                   'User',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    if (upsertError) {
      console.error('[callback] profile upsert error:', upsertError.message)
    }

    // Check if profile needs onboarding
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('business_name')
      .eq('id', user.id)
      .single()

    if (!existingProfile?.business_name) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  } else if (userError) {
    console.error('[callback] getUser error:', userError.message)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}