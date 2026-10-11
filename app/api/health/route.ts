import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Health Check Endpoint
 * Supports lightweight liveness ping and dependency-aware readiness checks.
 */
export async function GET(request: NextRequest) {
  const isReadiness = request.nextUrl.searchParams.get('check') === 'readiness'
  const uptime = Math.floor(process.uptime())
  const timestamp = new Date().toISOString()

  if (!isReadiness) {
    // Lightweight Liveness Probe
    return NextResponse.json(
      {
        status: 'ok',
        service: 'settlr-api',
        uptime,
        timestamp,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  }

  // Dependency-Aware Readiness Probe
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'settlr-api',
        uptime,
        timestamp,
        dependencies: {
          database: 'unconfigured',
        },
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    // Fast health query to verify database connectivity
    const { error } = await supabase.from('profiles').select('id').limit(1)

    const dbHealthy = !error || error.code === 'PGRST116' || !error.message.includes('fetch failed')

    return NextResponse.json(
      {
        status: dbHealthy ? 'ok' : 'degraded',
        service: 'settlr-api',
        uptime,
        timestamp,
        dependencies: {
          database: dbHealthy ? 'connected' : 'error',
          databaseDetail: error ? error.message : 'ready',
        },
      },
      {
        status: dbHealthy ? 200 : 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'down',
        service: 'settlr-api',
        uptime,
        timestamp,
        dependencies: {
          database: 'unreachable',
          error: err?.message,
        },
      },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  }
}
