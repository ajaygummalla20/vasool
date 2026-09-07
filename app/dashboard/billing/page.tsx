import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-server'
import BillingPage from './BillingPage'

export default async function BillingRoute() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name, phone, upi_id')
    .eq('id', user.id)
    .single()

  // Fetch subscription status
  let subscription: any = null
  try {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
    subscription = data
  } catch {
    subscription = null
  }

  // Count active usage for free plan limits display
  const { count: invoiceCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <BillingPage
      subscription={subscription}
      usage={{
        invoicesCreated: invoiceCount || 0,
        clientsAdded: clientCount || 0,
      }}
      userName={profile?.full_name || user.email?.split('@')[0] || ''}
      userEmail={user.email || ''}
      userPhone={profile?.phone || ''}
      userId={user.id}
      razorpayKeyId={process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || ''}
    />
  )
}
