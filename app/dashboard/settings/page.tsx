import { redirect } from 'next/navigation'
import { createClient } from './supabase-server'
import SettingsPage from './SettingsPage'

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) redirect('/login')
  return <SettingsPage />
}