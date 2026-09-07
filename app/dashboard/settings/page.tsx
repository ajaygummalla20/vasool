import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import SettingsPage from './SettingsPage'

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) redirect('/login')

  const params = searchParams ? await searchParams : {}
  const tabParam = typeof params.tab === 'string' ? params.tab : undefined
  const initialTab = (tabParam && ['profile', 'business', 'payments', 'invoice'].includes(tabParam))
    ? (tabParam as 'profile' | 'business' | 'payments' | 'invoice')
    : undefined

  return <SettingsPage initialTab={initialTab} />
}