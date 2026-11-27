import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EbayShippingClient from './EbayShippingClient'

export default async function AdminEbayShippingPage(props: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await props.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${lang}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect(`/${lang}/dashboard`)
  }

  return <EbayShippingClient lang={lang} />
}