import { NextResponse } from 'next/server'

/**
 * Lightweight Health Check Endpoint
 * Returns 200 OK with uptime and timestamp for external monitors (UptimeRobot, BetterStack).
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'settlr-api',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
