import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import OnboardingPage from './OnboardingPage'

export default async function OnboardingRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <OnboardingPage
      initialProfile={profile || {}}
      userId={user.id}
      userEmail={user.email || ''}
    />
  )
}
