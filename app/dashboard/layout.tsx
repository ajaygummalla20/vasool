import React from 'react'

// Force dynamic rendering for all dashboard pages to prevent build-time static prerendering errors
export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
