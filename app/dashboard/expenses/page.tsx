import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import ExpensesPage from './ExpensesPage'

export default async function ExpensesRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Try to fetch expenses — table may not exist yet
  let expenses: any[] = []
  try {
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })
    expenses = data || []
  } catch {
    expenses = []
  }

  const userName = profile?.full_name || user.email?.split('@')[0] || ''
  const userEmail = user.email || ''

  return (
    <ExpensesPage
      expenses={expenses}
      userName={userName}
      userEmail={userEmail}
      userId={user.id}
    />
  )
}
