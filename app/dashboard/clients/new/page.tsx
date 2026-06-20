// ─────────────────────────────────────────────────────────────
// FILE 1: app/dashboard/clients/new/page.tsx
// ─────────────────────────────────────────────────────────────
// Copy everything below this comment into that file.

import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase-server'
import AddClientPage from './AddClientPage'

export default async function NewClientPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <AddClientPage
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
    />
  )
}